// Picks active bots and books with extracted text, asks Mistral for verdict,
// then writes review (rating + comment) and like/dislike from each bot.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI_URL = "https://api.mistral.ai/v1/chat/completions";
const MODEL = "mistral-large-latest";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Bot {
  id: string;
  profile_id: string;
  display_name: string;
  personality: string;
  review_style: string;
}

interface Verdict {
  rating: number;       // 1..5
  liked: boolean;
  comment: string;
  sentiment: "positive" | "negative" | "neutral";
}

// Detect when the "extracted text" is actually raw PDF stream data
// (FlateDecode / JFIF base64 / XObject) instead of real readable Arabic.
// We never want to feed this to the bots — they would (correctly) write
// reviews complaining about "PDF codes and encrypted images".
function isTextCorrupted(text: string): boolean {
  if (!text || text.length < 200) return true;
  const sample = text.slice(0, 4000);

  const pdfMarkers = [
    "FlateDecode", "endstream", "endobj", "XObject",
    "DeviceRGB", "DCTDecode", "JFIF", "BitsPerComponent",
  ];
  let markerHits = 0;
  for (const m of pdfMarkers) {
    if (sample.includes(m)) markerHits++;
    if (markerHits >= 2) return true;
  }

  // Arabic ratio check: a real Arabic book should have >15% Arabic letters.
  const arabicChars = (sample.match(/[\u0600-\u06FF]/g) || []).length;
  const totalLetters = (sample.match(/[A-Za-z\u0600-\u06FF]/g) || []).length;
  if (totalLetters > 200 && arabicChars / totalLetters < 0.15) return true;

  return false;
}

// Pick distributed samples from beginning, middle sections, and end
// so the bot "reads" the whole book, not just one chunk.
function pickSamples(text: string, n = 6, size = 2000): string {
  const cleaned = (text || "").replace(/\s+/g, " ").trim();
  if (cleaned.length <= size * n) return cleaned;
  const step = Math.floor((cleaned.length - size) / (n - 1));
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const start = i * step;
    out.push(`[المقطع ${i + 1}]: ${cleaned.slice(start, start + size)}`);
  }
  return out.join("\n\n---\n\n");
}

async function askAI(
  apiKey: string,
  bot: Bot,
  title: string,
  author: string,
  samples: string,
  previousOpenings: string[] = [],
): Promise<Verdict> {
  const styleHint =
    bot.review_style === "strict" ? "كن صارماً ولا تجامل، أعطِ تقييماً منخفضاً للكتب الضعيفة، وانتقد بصراحة ما لم يعجبك" :
    bot.review_style === "lenient" ? "كن متفائلاً ومتسامحاً، ركّز على الإيجابيات لكن لا تبالغ بشكل مصطنع" :
    "كن متوازناً وعادلاً، تحدث عن النقاط القوية والضعيفة بصدق";

  // Random opening style hints to force diversity (rotate every call)
  const openingStyles = [
    "ابدأ بسؤال بلاغي أو تساؤل عن فكرة في الكتاب",
    "ابدأ بانطباع شخصي مباشر مثل: شعرت بـ... / لفت نظري... / استوقفني...",
    "ابدأ بمشهد أو فكرة محددة من الكتاب ثم علّق عليها",
    "ابدأ بمقارنة الكتاب بشيء آخر قرأته أو بفكرة عامة",
    "ابدأ باعتراف صادق: لم أتوقع... / فاجأني... / صدمني...",
    "ابدأ بحكم سريع ثم برره: كتاب يستحق / كتاب مخيب / كتاب عادي...",
    "ابدأ بوصف الإحساس بعد القراءة: أغلقت الكتاب وأنا...",
    "ابدأ بنقد مباشر للأسلوب أو اللغة أو البناء",
    "ابدأ باقتباس فكرة من الكتاب بكلماتك ثم اعلّق",
    "ابدأ بتعليق على المؤلف وأسلوبه دون مديح عام",
  ];
  const chosenStyle = openingStyles[Math.floor(Math.random() * openingStyles.length)];

  const avoidList = previousOpenings.length
    ? `\n\nتجنّب تماماً البدء بأي من هذه الصياغات (لأنك استخدمتها سابقاً):\n${previousOpenings.map((o) => `- "${o}..."`).join("\n")}`
    : "";

  const prompt = `أنت قارئ عربي حقيقي اسمك "${bot.display_name}" وشخصيتك: "${bot.personality}". ${styleHint}.
قرأت كتاب "${title}" للمؤلف "${author}" بالكامل، وفيما يلي مقتطفات حقيقية موزعة من بدايته ووسطه ونهايته:

${samples}

اكتب مراجعتك كما يكتبها قارئ بشري عادي على موقع كتب — ليس كناقد رسمي ولا بأسلوب أكاديمي. تحدث بصوتك الطبيعي.

قواعد صارمة لكتابة التعليق:
1) ${chosenStyle}.
2) ممنوع منعاً باتاً البدء بعبارات مستهلكة مثل: "هذا الكتاب"، "كتاب رائع"، "قرأت هذا الكتاب"، "في هذا الكتاب"، "يتناول الكتاب"، "يعد الكتاب"، "إن هذا الكتاب"، "من خلال قراءتي"، "بصراحة"، "في الحقيقة"، "بدون شك"، "لا شك أن".
3) لا تكرر اسم الكتاب أو المؤلف في أول جملة.
4) اذكر تفصيلاً ملموساً من المقتطفات (فكرة، مشهد، جملة، شخصية، أسلوب) — لا كلام عام يصلح لأي كتاب.
5) عبّر عن مشاعرك بصدق إيجاباً أو سلباً، ولا تكن محايداً مائعاً. حدد موقفك بوضوح: هل أعجبك أم لا؟
6) استخدم لهجة بشرية طبيعية، يمكن أن تكون عامية بسيطة أو فصحى مرنة، وتجنب الكلام المنمّق المصطنع.
7) طول التعليق بين 100 و 300 حرف فقط، جملتين أو ثلاث جمل قصيرة.${avoidList}

أعطِ ردك بصيغة JSON فقط بهذا الشكل بالضبط، بدون أي نص خارجي:
{
  "rating": <رقم من 1 إلى 5 يعكس رأيك الحقيقي>,
  "liked": <true إذا أعجبك فعلاً أو false إذا لم يعجبك>,
  "sentiment": "positive" أو "negative" (تجنب neutral قدر الإمكان واتخذ موقفاً واضحاً),
  "comment": "<تعليقك الطبيعي البشري>"
}`;

  // Retry with exponential backoff on 429/503 (Mistral rate limits)
  let res!: Response;
  let lastErr = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    res = await fetch(AI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: "أنت قارئ عربي حقيقي تكتب تعليقاً على كتاب قرأته. تتحدث بلغة بشرية طبيعية كأي شخص عادي، وليس بأسلوب ناقد رسمي. تتجنب تماماً العبارات المستهلكة والمكررة، وتبدأ تعليقك بصياغة مختلفة في كل مرة. ترد بصيغة JSON فقط بدون أي نص خارجي." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 1.0,
        top_p: 0.95,
        presence_penalty: 0.6,
        frequency_penalty: 0.6,
      }),
    });
    if (res.ok) break;
    lastErr = await res.text();
    if (res.status === 429 || res.status === 503 || res.status === 502) {
      // exponential backoff: 3s, 6s, 12s, 24s, 48s
      await sleep(3000 * Math.pow(2, attempt));
      continue;
    }
    break;
  }

  if (!res.ok) {
    throw new Error(`AI ${res.status}: ${lastErr}`);
  }
  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content ?? "{}";
  // Strip code fences if model wrapped JSON
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
  const parsed = JSON.parse(cleaned);

  let rating = Number(parsed.rating);
  if (!Number.isFinite(rating)) rating = 3;
  rating = Math.max(1, Math.min(5, Math.round(rating)));

  return {
    rating,
    liked: Boolean(parsed.liked),
    comment: String(parsed.comment ?? "").slice(0, 500),
    sentiment: (parsed.sentiment === "positive" || parsed.sentiment === "negative") ? parsed.sentiment : "neutral",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const AI_API_KEY = Deno.env.get("MISTRAL_API_KEY");
    if (!AI_API_KEY) {
      return new Response(JSON.stringify({ error: "MISTRAL_API_KEY missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    let body: any = {};
    try { body = await req.json(); } catch {}
    const maxBots = Math.min(Math.max(Number(body.maxBots) || 5, 1), 20);
    const maxBooksPerBot = Math.min(Math.max(Number(body.maxBooksPerBot) || 1, 1), 3);

    // 1) get active bots (random subset)
    const { data: bots, error: botsErr } = await supabase
      .from("ai_bot_accounts")
      .select("id, profile_id, display_name, personality, review_style")
      .eq("is_active", true);
    if (botsErr) throw botsErr;
    if (!bots || bots.length === 0) {
      return new Response(JSON.stringify({ message: "No bots found. Run ai-bots-seed first.", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const shuffledBots = [...bots].sort(() => Math.random() - 0.5).slice(0, maxBots);

    // 2) candidate books with extracted text
    const { data: textRows, error: textErr } = await supabase
      .from("book_extracted_text")
      .select("book_id, text_length")
      .eq("extraction_status", "completed")
      .gt("text_length", 500)
      .limit(200);
    if (textErr) throw textErr;
    const allBookIds = (textRows ?? []).map((r: any) => r.book_id).filter(Boolean);

    if (allBookIds.length === 0) {
      return new Response(JSON.stringify({ message: "No books with extracted text", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const results: any[] = [];

    for (const bot of shuffledBots) {
      // skip books this bot already reviewed
      const { data: alreadyDone } = await supabase
        .from("ai_bot_book_activity_log")
        .select("book_id")
        .eq("bot_id", bot.id);
      const doneSet = new Set((alreadyDone ?? []).map((r: any) => r.book_id));
      const eligible = allBookIds.filter((id) => !doneSet.has(id));
      if (eligible.length === 0) {
        results.push({ bot: bot.display_name, status: "no_new_books" });
        continue;
      }
      const picks = eligible.sort(() => Math.random() - 0.5).slice(0, maxBooksPerBot);

      // Fetch this bot's recent comment openings (first 5 words) to avoid repetition
      const { data: pastReviews } = await supabase
        .from("book_reviews")
        .select("comment")
        .eq("user_id", bot.profile_id)
        .order("created_at", { ascending: false })
        .limit(15);
      const previousOpenings = (pastReviews ?? [])
        .map((r: any) => String(r.comment || "").trim().split(/\s+/).slice(0, 5).join(" "))
        .filter((s: string) => s.length > 0);

      for (const bookId of picks) {
        try {
          // fetch book meta
          const { data: book, error: bookErr } = await supabase
            .from("book_submissions")
            .select("id, title, author, status")
            .eq("id", bookId)
            .eq("status", "approved")
            .maybeSingle();
          if (bookErr || !book) {
            await supabase.from("ai_bot_book_activity_log").insert({
              bot_id: bot.id, book_id: bookId, action_type: "skipped", status: "skipped",
              error_message: "book not approved",
            });
            continue;
          }

          const { data: textRow } = await supabase
            .from("book_extracted_text")
            .select("extracted_text")
            .eq("book_id", bookId)
            .maybeSingle();
          const text = textRow?.extracted_text ?? "";
          if (!text || text.length < 500) {
            await supabase.from("ai_bot_book_activity_log").insert({
              bot_id: bot.id, book_id: bookId, action_type: "skipped", status: "skipped",
              error_message: "insufficient text",
            });
            continue;
          }

          // CRITICAL: never feed raw PDF garbage to the bots — they would
          // (correctly) write reviews complaining about "PDF codes and
          // encrypted images". Mark the text as failed so it gets re-extracted
          // and skip this book for now.
          if (isTextCorrupted(text)) {
            await supabase
              .from("book_extracted_text")
              .update({
                extraction_status: "failed",
                extraction_error: "detected raw PDF/binary content - needs re-extraction",
                updated_at: new Date().toISOString(),
              })
              .eq("book_id", bookId);
            await supabase.from("ai_bot_book_activity_log").insert({
              bot_id: bot.id, book_id: bookId, action_type: "skipped", status: "skipped",
              error_message: "corrupt extracted text (raw PDF stream)",
            });
            results.push({ bot: bot.display_name, book_id: bookId, skipped: "corrupt_text" });
            continue;
          }

          // Try up to 2 times if the AI returns a banned/repeated opening
          const bannedStarts = [
            "هذا الكتاب", "كتاب رائع", "قرأت هذا", "في هذا الكتاب", "يتناول الكتاب",
            "يعد الكتاب", "إن هذا", "من خلال قراءتي", "بصراحة", "في الحقيقة",
            "بدون شك", "لا شك", "كتاب جميل", "كتاب ممتاز", "كتاب مميز",
          ];
          let verdict = await askAI(AI_API_KEY, bot as Bot, book.title, book.author, pickSamples(text), previousOpenings);
          const opens = (c: string) => bannedStarts.some((b) => c.trim().startsWith(b));
          const matchesPrev = (c: string) => {
            const head = c.trim().split(/\s+/).slice(0, 4).join(" ");
            return previousOpenings.some((p) => p.startsWith(head) || head.startsWith(p.split(/\s+/).slice(0, 4).join(" ")));
          };
          if (opens(verdict.comment) || matchesPrev(verdict.comment)) {
            await sleep(3000);
            const retry = await askAI(
              AI_API_KEY, bot as Bot, book.title, book.author, pickSamples(text),
              [...previousOpenings, verdict.comment.trim().split(/\s+/).slice(0, 5).join(" ")],
            );
            if (!opens(retry.comment)) verdict = retry;
          }

          // Track this opening so the next book in this run also avoids it
          previousOpenings.unshift(verdict.comment.trim().split(/\s+/).slice(0, 5).join(" "));

          // Delay between AI calls to stay well under Mistral's per-minute limit
          await sleep(3000);

          // The bot "reads" the book — bump the view counter so it reflects real activity
          try {
            await supabase.rpc("increment_book_views", { p_book_id: bookId });
          } catch (_) {
            // non-fatal
          }

          // book_reviews has no UNIQUE(book_id,user_id) — manually upsert
          const { data: existingReview } = await supabase
            .from("book_reviews")
            .select("id")
            .eq("book_id", bookId)
            .eq("user_id", bot.profile_id)
            .maybeSingle();

          if (existingReview) {
            const { error: updErr } = await supabase
              .from("book_reviews")
              .update({
                rating: verdict.rating,
                comment: verdict.comment,
                recommend: verdict.liked,
              })
              .eq("id", existingReview.id);
            if (updErr) throw new Error(`review update failed: ${updErr.message}`);
          } else {
            const { error: insErr } = await supabase.from("book_reviews").insert({
              book_id: bookId,
              user_id: bot.profile_id,
              rating: verdict.rating,
              comment: verdict.comment,
              recommend: verdict.liked,
            });
            if (insErr) throw new Error(`review insert failed: ${insErr.message}`);
          }

          // Like or dislike (mutually exclusive — clear the other first)
          if (verdict.liked) {
            await supabase.from("book_dislikes").delete().eq("book_id", bookId).eq("user_id", bot.profile_id);
            await supabase.from("book_likes").upsert({
              book_id: bookId, user_id: bot.profile_id,
            }, { onConflict: "book_id,user_id" });
          } else {
            await supabase.from("book_likes").delete().eq("book_id", bookId).eq("user_id", bot.profile_id);
            await supabase.from("book_dislikes").upsert({
              book_id: bookId, user_id: bot.profile_id,
            }, { onConflict: "book_id,user_id" });
          }

          await supabase.from("ai_bot_book_activity_log").insert({
            bot_id: bot.id,
            book_id: bookId,
            action_type: "review",
            rating: verdict.rating,
            sentiment: verdict.sentiment,
            status: "success",
          });

          // تحديث آخر ظهور للبوت ليعكس نشاطه الفعلي
          await supabase
            .from("profiles")
            .update({ last_seen: new Date().toISOString() })
            .eq("id", bot.profile_id);

          results.push({ bot: bot.display_name, book: book.title, rating: verdict.rating, liked: verdict.liked });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          await supabase.from("ai_bot_book_activity_log").insert({
            bot_id: bot.id, book_id: bookId, action_type: "review",
            status: "error", error_message: msg.slice(0, 500),
          });
          results.push({ bot: bot.display_name, book_id: bookId, error: msg });
        }
      }
    }

    return new Response(JSON.stringify({ success: true, processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});