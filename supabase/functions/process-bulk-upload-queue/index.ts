// معالج طابور الرفع الخلفي
// يستدعى كل دقيقة من cron — يأخذ دفعة من جدول bulk_upload_queue
// ويستدعي bulk-upload-books-ai لمعالجتها، ثم يحدّث حالة كل صف.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// الحد الأقصى لعدد الكتب المسحوبة من **كل دفعة (batch_label)** في التشغيل الواحد.
// مخفّض إلى 3 لتفادي تكدّس الطلبات على Mistral / AI Gateway.
const PER_BATCH_LIMIT = 3;

// سقف صارم على إجمالي الكتب المعالَجة لكل تشغيل cron مهما تعدّدت الدفعات النشطة.
// يمنع سحب 30+ كتاب دفعة واحدة عند وجود عدة batch_labels، وهو السبب الرئيسي للفشل الجماعي.
const MAX_TOTAL_PER_RUN = 6;

// حجم القطعة المُرسَلة في كل استدعاء HTTP لـ bulk-upload-books-ai.
// نقسّم الكتب المسحوبة إلى قطع صغيرة ونرسلها بالتوازي، بدل طلب HTTP واحد ضخم
// كان يتجاوز timeout الـ Edge Function (≈150s) ويفشل كل الكتب دفعة واحدة.
const AI_CHUNK_SIZE = 2;

// عند انتهاء أول مجموعة بسرعة، ابدأ مجموعات لاحقة تلقائياً داخل نفس التشغيل.
// هذا يمنع توقف الطابور حتى الضغط على "تشغيل الآن"، مع إبقاء حد زمني آمن قبل timeout.
const MAX_ROUNDS_PER_INVOCATION = 3;
const MAX_INVOCATION_MS = 115_000;

interface QueueItem {
  id: string;
  title: string;
  book_file_url: string;
  cover_image_url: string | null;
  attempts: number;
  max_attempts: number;
  created_by_email: string | null;
}

interface BookResult {
  success?: boolean;
  duplicate?: boolean;
  retryable?: boolean;
  title?: string;
  error?: string;
  id?: string;
  page_count?: number | null;
}

interface QueueSummary {
  processed: number;
  success: number;
  failed: number;
  duplicates: number;
  requeued: number;
}

const emptySummary = (): QueueSummary => ({
  processed: 0,
  success: 0,
  failed: 0,
  duplicates: 0,
  requeued: 0,
});

const addSummary = (target: QueueSummary, part: QueueSummary) => {
  target.processed += part.processed;
  target.success += part.success;
  target.failed += part.failed;
  target.duplicates += part.duplicates;
  target.requeued += part.requeued;
};

async function processQueueRound(supabase: any, supabaseUrl: string, serviceKey: string): Promise<QueueSummary> {
  const summary = emptySummary();

  // اختر دفعة وعلّمها كـ "processing" بشكل ذرّي
  const { data: claimed, error: claimError } = await supabase
    .rpc("claim_bulk_upload_items", { p_limit: PER_BATCH_LIMIT });

  if (claimError) {
    console.error("[Queue] claim error:", claimError);
    throw new Error(claimError.message);
  }

  let items = (claimed || []) as QueueItem[];

  // طبّق السقف الإجمالي وأعِد الفائض إلى pending فورًا حتى لا يبقى عالقًا في processing.
  if (items.length > MAX_TOTAL_PER_RUN) {
    const overflow = items.slice(MAX_TOTAL_PER_RUN);
    items = items.slice(0, MAX_TOTAL_PER_RUN);
    const overflowIds = overflow.map((it) => it.id);
    await supabase
      .from("bulk_upload_queue")
      .update({ status: "pending", started_at: null })
      .in("id", overflowIds);
    console.log(`[Queue] ↩️ أُعيد ${overflow.length} كتاب إلى pending (تجاوز السقف الإجمالي ${MAX_TOTAL_PER_RUN})`);
  }

  if (items.length === 0) return summary;

  summary.processed = items.length;
  console.log(`[Queue] ⚙️ معالجة ${items.length} كتاب من الطابور`);

  // قسّم العناصر إلى قطع صغيرة وأرسلها بالتوازي إلى دالة الرفع الذكية.
  const chunks: QueueItem[][] = [];
  for (let i = 0; i < items.length; i += AI_CHUNK_SIZE) {
    chunks.push(items.slice(i, i + AI_CHUNK_SIZE));
  }

  const chunkResponses = await Promise.allSettled(
    chunks.map((chunk) =>
      fetch(`${supabaseUrl}/functions/v1/bulk-upload-books-ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          books: chunk.map((item) => ({
            title: item.title,
            book_file_url: item.book_file_url,
            cover_image_url: item.cover_image_url ?? undefined,
            user_email: item.created_by_email ?? "queue@kotobi.local",
          })),
        }),
      })
        .then(async (res) => {
          let payload: any = {};
          try { payload = await res.json(); } catch (_) {}
          return { ok: res.ok, status: res.status, payload };
        })
        .catch((err) => ({
          ok: false,
          status: 0,
          payload: { error: err instanceof Error ? err.message : "fetch_failed" },
        })),
    ),
  );

  // ادمج نتائج كل القطع وحاذيها مع items بالترتيب نفسه.
  const results: BookResult[] = [];
  chunks.forEach((chunk, idx) => {
    const settled = chunkResponses[idx];
    const resp = settled.status === "fulfilled"
      ? settled.value
      : { ok: false, status: 0, payload: { error: "chunk_rejected" } };
    const chunkResults: BookResult[] = Array.isArray(resp.payload?.results)
      ? resp.payload.results
      : chunk.map((it) => ({
          success: false,
          retryable: !resp.ok,
          title: it.title,
          error: resp.payload?.error || `HTTP ${resp.status}`,
        }));
    results.push(...chunkResults);
  });

  // حدّث حالة كل صف
  const nowIso = new Date().toISOString();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const result = results[i] || results.find((r) => r.title === item.title) || {
      success: false,
      retryable: true,
      error: "no_result",
    };

    let nextStatus: string;
    if (result.success) {
      nextStatus = "success";
      summary.success++;
    } else if (result.duplicate) {
      nextStatus = "duplicate";
      summary.duplicates++;
    } else if (result.retryable && item.attempts < item.max_attempts) {
      nextStatus = "pending"; // أعِد للطابور
      summary.requeued++;
    } else {
      nextStatus = "failed";
      summary.failed++;
    }

    await supabase
      .from("bulk_upload_queue")
      .update({
        status: nextStatus,
        error: result.error ?? null,
        result_book_id: result.id ?? null,
        page_count: result.page_count ?? null,
        finished_at: nextStatus === "pending" ? null : nowIso,
        started_at: nextStatus === "pending" ? null : undefined,
      })
      .eq("id", item.id);
  }

  console.log(`[Queue] ✅ نجح ${summary.success} • مكرر ${summary.duplicates} • فشل ${summary.failed} • أعيد ${summary.requeued}`);
  return summary;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const startedAt = Date.now();
    const total = emptySummary();

    for (let round = 1; round <= MAX_ROUNDS_PER_INVOCATION; round++) {
      if (Date.now() - startedAt > MAX_INVOCATION_MS) {
        console.log("[Queue] ⏱️ توقف آمن قبل timeout، سيكمل cron تلقائياً");
        break;
      }

      const part = await processQueueRound(supabase, supabaseUrl, serviceKey);
      if (part.processed === 0) break;
      addSummary(total, part);
    }

    if (total.processed === 0) {
      return new Response(JSON.stringify({ success: true, processed: 0, message: "لا توجد عناصر معلّقة" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[Queue] 🧾 الإجمالي: ${total.processed} كتاب • نجح ${total.success} • مكرر ${total.duplicates} • فشل ${total.failed} • أعيد ${total.requeued}`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: total.processed,
        summary: {
          success: total.success,
          failed: total.failed,
          duplicates: total.duplicates,
          requeued: total.requeued,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[Queue] خطأ غير متوقع:", err);
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : "خطأ غير معروف" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
