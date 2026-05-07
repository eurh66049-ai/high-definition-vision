// عامل الاكتشاف والرفع التلقائي المستمر من Archive.org
// يُستدعى من cron كل دقيقة. عند التفعيل:
// 1) يفحص عدد الكتب المعلّقة في bulk_upload_queue
// 2) إذا كانت أقل من min_pending_threshold، يجلب دفعة (batch_size, افتراضي 100) من Archive.org
//    ابتداءً من cursor المحفوظ، ويضيفها إلى الطابور
// 3) معالج الطابور (process-bulk-upload-queue) الذي يعمل بالفعل كل دقيقة هو ما يرفع الكتب
// النتيجة: تدفّق مستمر بلا توقف وبلا تدخل من المستخدم.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Config {
  enabled: boolean;
  search_query: string;
  cursor: string | null;
  batch_size: number;
  min_pending_threshold: number;
  total_discovered: number;
}

// تحسين الاستعلام عبر Mistral (اختياري)
async function refineQueryWithMistral(userQuery: string): Promise<string> {
  const apiKey = Deno.env.get("MISTRAL_API_KEY");
  if (!apiKey || !userQuery) return userQuery;
  try {
    const r = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "mistral-large-latest",
        messages: [
          { role: "system", content: "حوّل طلب المستخدم إلى استعلام بحث archive.org Lucene لكتب PDF عربية. استخدم language:Arabic و mediatype:texts و format:PDF. أعد الاستعلام فقط." },
          { role: "user", content: userQuery },
        ],
        temperature: 0.2,
        max_tokens: 200,
      }),
    });
    if (!r.ok) return userQuery;
    const d = await r.json();
    const refined = (d.choices?.[0]?.message?.content || "").trim().replace(/^["']|["']$/g, "");
    return refined || userQuery;
  } catch { return userQuery; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    // 1) قراءة الإعدادات
    const { data: cfg, error: cfgErr } = await supabase
      .from("auto_discover_config")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (cfgErr) throw new Error(cfgErr.message);
    if (!cfg) {
      return new Response(JSON.stringify({ success: false, error: "config_missing" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const config = cfg as Config;

    if (!config.enabled) {
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) فحص عدد الكتب المعلّقة (pending) في الطابور
    const { count: pendingCount, error: countErr } = await supabase
      .from("bulk_upload_queue")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "processing"]);

    if (countErr) throw new Error(countErr.message);

    const threshold = config.min_pending_threshold || 100;
    const pending = pendingCount || 0;

    if (pending >= threshold) {
      // الطابور ممتلئ بما يكفي - لا داعي لجلب المزيد الآن
      await supabase.from("auto_discover_config").update({
        last_run_at: new Date().toISOString(),
        last_status: `قائمة الانتظار ممتلئة (${pending}/${threshold})، تم التخطي`,
        last_error: null,
      }).eq("id", 1);
      return new Response(JSON.stringify({ success: true, skipped: true, pending, threshold }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3) تحضير استعلام Archive.org
    let archiveQuery = config.search_query?.trim() || "language:arabic AND mediatype:texts";
    if (!/mediatype/i.test(archiveQuery)) {
      archiveQuery = await refineQueryWithMistral(archiveQuery);
    }
    if (!/mediatype/i.test(archiveQuery)) archiveQuery += " AND mediatype:texts";

    const batchSize = Math.min(config.batch_size || 100, 200);
    // الهدف: عدد الكتب الجديدة التي نريد إضافتها هذا التشغيل
    const targetFresh = Math.max(threshold - pending, batchSize);

    function isRealTitle(t: string | null | undefined, identifier: string): boolean {
      if (!t) return false;
      const s = t.toString().trim();
      if (s.length < 3) return false;
      if (s.toLowerCase() === identifier.toLowerCase()) return false;
      if (/^[\w\-_.]+$/.test(s) && !/[\u0600-\u06FFa-zA-Z]{3,}/.test(s)) return false;
      if (/^(untitled|unknown|no\s*title|scan\d*|بدون\s*عنوان|غير\s*معروف)$/i.test(s)) return false;
      return true;
    }

    async function resolveBook(identifier: string, fallbackTitle: string): Promise<{ title: string; url: string } | null> {
      try {
        const r = await fetch(`https://archive.org/metadata/${encodeURIComponent(identifier)}`, {
          headers: { "User-Agent": "KotobiAutoDiscovery/1.0" },
        });
        if (!r.ok) return null;
        const meta = await r.json();
        const metaTitleRaw = meta?.metadata?.title;
        const metaTitle = Array.isArray(metaTitleRaw) ? metaTitleRaw[0] : metaTitleRaw;
        const candidateTitles = [metaTitle, fallbackTitle].filter(Boolean) as string[];
        const realTitle = candidateTitles.find((t) => isRealTitle(t, identifier));
        if (!realTitle) return null;

        const files: any[] = Array.isArray(meta?.files) ? meta.files : [];
        const pdfs = files
          .filter((f) => typeof f.name === "string" && /\.pdf$/i.test(f.name))
          .map((f) => ({ name: f.name as string, size: f.size ? parseInt(f.size, 10) : 0 }));
        if (pdfs.length === 0) return null;
        const preferred = pdfs
          .filter((f) => !/_bw\.pdf$|_text\.pdf$/i.test(f.name))
          .sort((a, b) => b.size - a.size);
        const chosen = preferred[0] || pdfs[0];
        const MAX_BYTES = 45 * 1024 * 1024;
        if (chosen.size && chosen.size > MAX_BYTES) return null;
        return {
          title: realTitle.toString().trim().slice(0, 500),
          url: `https://archive.org/download/${encodeURIComponent(identifier)}/${encodeURI(chosen.name)}`,
        };
      } catch {
        return null;
      }
    }

    // فلترة المعرّفات مقابل قاعدة البيانات (queue + submissions) قبل أي metadata fetch
    async function filterAlreadyKnown(ids: string[]): Promise<Set<string>> {
      const known = new Set<string>();
      if (ids.length === 0) return known;
      // 1) في bulk_upload_queue (حسب نمط الرابط)
      const orQueue = ids.map((id) => `book_file_url.ilike.%/download/${id.replace(/[%,()]/g, "")}/%`).join(",");
      try {
        const { data: q } = await supabase.from("bulk_upload_queue").select("book_file_url").or(orQueue);
        for (const row of q || []) {
          const u = String((row as any).book_file_url || "");
          for (const id of ids) if (u.includes(`/download/${id}/`)) known.add(id);
        }
      } catch (_) {}
      // 2) في book_submissions (المنشورة سابقًا)
      const remaining = ids.filter((id) => !known.has(id));
      if (remaining.length > 0) {
        const orSub = remaining.map((id) => `source_book_file_url.ilike.%${id.replace(/[%,()]/g, "")}%`).join(",");
        try {
          const { data: s } = await supabase.from("book_submissions").select("source_book_file_url").or(orSub);
          for (const row of s || []) {
            const u = String((row as any).source_book_file_url || "");
            for (const id of remaining) if (u.includes(id)) known.add(id);
          }
        } catch (_) {}
      }
      return known;
    }

    // 4) حلقة بحث متعددة الصفحات: نستمر بالتقدم في cursor حتى نجمع عددًا كافيًا من الكتب الجديدة
    const STARTED_AT = Date.now();
    const MAX_MS = 90_000;
    const MAX_PAGES = 15;
    let cursor: string | null = config.cursor;
    let totalScanned = 0;
    let totalAlreadyKnown = 0;
    let totalSkippedNoTitle = 0;
    let exhausted = false;

    const fresh: Array<{ title: string; book_file_url: string; identifier: string }> = [];
    const insertedUrls = new Set<string>();

    for (let page = 0; page < MAX_PAGES; page++) {
      if (fresh.length >= targetFresh) break;
      if (Date.now() - STARTED_AT > MAX_MS) break;

      const scrapeUrl = new URL("https://archive.org/services/search/v1/scrape");
      scrapeUrl.searchParams.set("q", archiveQuery);
      scrapeUrl.searchParams.set("fields", "identifier,title");
      scrapeUrl.searchParams.set("count", String(batchSize));
      if (cursor) scrapeUrl.searchParams.set("cursor", cursor);

      const archRes = await fetch(scrapeUrl.toString(), {
        headers: { "User-Agent": "KotobiAutoDiscovery/1.0" },
      });
      if (!archRes.ok) {
        const txt = await archRes.text();
        throw new Error(`archive.org HTTP ${archRes.status}: ${txt.slice(0, 200)}`);
      }
      const archData = await archRes.json();
      const items: Array<{ identifier: string; title: string | string[] }> =
        Array.isArray(archData?.items) ? archData.items : [];
      cursor = archData?.cursor || null;
      totalScanned += items.length;

      if (items.length === 0) { exhausted = true; break; }

      // فلترة المعرّفات المعروفة مسبقًا (مكررة)
      const ids = items.map((it) => it.identifier);
      const known = await filterAlreadyKnown(ids);
      totalAlreadyKnown += known.size;
      const unknownItems = items.filter((it) => !known.has(it.identifier));
      if (unknownItems.length === 0) {
        // كل هذه الصفحة مكررة → تابع للصفحة التالية
        if (!cursor) { exhausted = true; break; }
        continue;
      }

      // resolveBook بالتوازي للمعرّفات الجديدة فقط
      const CONCURRENCY = 8;
      let idx = 0;
      const pageFresh: Array<{ title: string; book_file_url: string; identifier: string }> = [];
      async function worker() {
        while (idx < unknownItems.length) {
          if (fresh.length + pageFresh.length >= targetFresh) return;
          const i = idx++;
          const it = unknownItems[i];
          const fallback = (Array.isArray(it.title) ? it.title[0] : it.title) || "";
          const book = await resolveBook(it.identifier, fallback);
          if (book) {
            if (!insertedUrls.has(book.url)) {
              insertedUrls.add(book.url);
              pageFresh.push({ title: book.title, book_file_url: book.url, identifier: it.identifier });
            }
          } else {
            totalSkippedNoTitle++;
          }
        }
      }
      await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

      // أدرج كتب هذه الصفحة فورًا حتى لا نخسرها عند timeout
      if (pageFresh.length > 0) {
        const batchLabel = `auto-${new Date().toISOString().slice(0, 19)}`;
        const rows = pageFresh.map((b) => ({
          title: b.title,
          book_file_url: b.book_file_url,
          cover_image_url: null,
          status: "pending",
          attempts: 0,
          max_attempts: 3,
          created_by_email: "auto-discover@kotobi.local",
          batch_label: batchLabel,
        }));
        const { error: insErr } = await supabase
          .from("bulk_upload_queue")
          .insert(rows);
        if (!insErr) {
          fresh.push(...pageFresh);
        } else {
          console.warn("[auto-discover] insert error:", insErr.message);
        }
      }

      if (!cursor) { exhausted = true; break; }
    }

    const inserted = fresh.length;
    const nextCursor = exhausted ? null : cursor;

    // 6) تحديث المؤشر والإحصاءات
    await supabase.from("auto_discover_config").update({
      cursor: nextCursor,
      total_discovered: (config.total_discovered || 0) + inserted,
      last_run_at: new Date().toISOString(),
      last_status: `أُضيف ${inserted} كتاب جديد (تم تخطي ${totalAlreadyKnown} مكرر و ${totalSkippedNoTitle} بدون اسم/PDF صالح من ${totalScanned} نتيجة، المعلّق: ${pending})${exhausted ? " — اكتملت دورة البحث" : ""}`,
      last_error: null,
    }).eq("id", 1);

    return new Response(JSON.stringify({
      success: true,
      scanned: totalScanned,
      inserted,
      already_known: totalAlreadyKnown,
      skipped_no_title: totalSkippedNoTitle,
      pending_before: pending,
      next_cursor: nextCursor,
      exhausted,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    console.error("[auto-discover] error:", msg);
    await supabase.from("auto_discover_config").update({
      last_run_at: new Date().toISOString(),
      last_status: "فشل",
      last_error: msg.slice(0, 500),
    }).eq("id", 1);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
