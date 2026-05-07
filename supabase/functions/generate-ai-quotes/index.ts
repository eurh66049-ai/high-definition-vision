// Edge function to generate AI quotes from books that have extracted text
// Uses Mistral AI to extract meaningful quotes verbatim from book content
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI_USER_ID = "00000000-0000-0000-0000-00000000a1a1";
const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";
const MISTRAL_MODEL = "mistral-large-latest";

interface BookMeta {
  id: string;
  title: string;
  author: string;
  cover_image_url: string | null;
  category: string | null;
  slug: string | null;
}

function pickTextSamples(text: string, sampleCount = 4, sampleSize = 3000): string {
  if (!text) return "";
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= sampleSize * sampleCount) return cleaned;
  const step = Math.floor(cleaned.length / (sampleCount + 1));
  const samples: string[] = [];
  for (let i = 1; i <= sampleCount; i++) {
    const start = step * i;
    samples.push(cleaned.slice(start, start + sampleSize));
  }
  return samples.join("\n\n---\n\n");
}

async function callMistral(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch(MISTRAL_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MISTRAL_MODEL,
      messages: [
        {
          role: "system",
          content:
            "أنت مساعد متخصص في استخراج اقتباسات أدبية وفكرية من الكتب. مهمتك هي استخراج اقتباسات حرفية (verbatim) من النص المعطى فقط دون أي تعديل أو إعادة صياغة. لا تخترع أو تؤلف من عندك. اختر فقط الجمل ذات القيمة الفكرية أو الأدبية أو الإنسانية العميقة. أعد النتيجة بصيغة JSON فقط.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
      max_tokens: 1500,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Mistral API error ${res.status}: ${errText}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "{}";
}

async function generateQuotesForBook(
  apiKey: string,
  book: BookMeta,
  text: string,
): Promise<string[]> {
  const samples = pickTextSamples(text);
  const prompt = `هذا نص من كتاب بعنوان "${book.title}" للمؤلف "${book.author}".
استخرج من النص التالي 3 اقتباسات حرفية فقط (نسخ مطابق تماماً للنص الأصلي دون أي تعديل).
شروط:
- يجب أن تكون كل جملة موجودة حرفياً في النص أدناه.
- اختر جملاً ذات معنى عميق أو قيمة فكرية أو أدبية.
- طول كل اقتباس بين 30 و 300 حرف.
- لا تضف علامات اقتباس في بداية أو نهاية النص.
- لا تؤلف أي شيء من عندك.

أعد الإجابة بصيغة JSON بهذا الشكل بالضبط:
{"quotes": ["النص الأول", "النص الثاني", "النص الثالث"]}

النص:
${samples}`;

  const raw = await callMistral(apiKey, prompt);
  try {
    const parsed = JSON.parse(raw);
    const arr = Array.isArray(parsed.quotes) ? parsed.quotes : [];
    return arr
      .filter((q: any) => typeof q === "string")
      .map((q: string) => q.trim())
      .filter((q: string) => q.length >= 30 && q.length <= 500);
  } catch (e) {
    console.error("JSON parse error:", e, raw);
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const MISTRAL_API_KEY = Deno.env.get("MISTRAL_API_KEY");

    if (!MISTRAL_API_KEY) {
      return new Response(
        JSON.stringify({ error: "MISTRAL_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Parse body for optional limit and bookId
    let bookId: string | null = null;
    let limit = 3;
    try {
      const body = await req.json();
      bookId = body?.bookId ?? null;
      if (typeof body?.limit === "number") limit = Math.min(Math.max(body.limit, 1), 10);
    } catch {}

    // Step 1: Get books with extracted text that haven't had quotes recently
    let candidateBookIds: string[] = [];

    if (bookId) {
      candidateBookIds = [bookId];
    } else {
      // Books with text completed and large enough
      const { data: textRows, error: textErr } = await supabase
        .from("book_extracted_text")
        .select("book_id, text_length")
        .eq("extraction_status", "completed")
        .gt("text_length", 1000)
        .limit(100);

      if (textErr) throw textErr;

      // Exclude books that already had quotes generated in the last 14 days
      const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const { data: recentLogs } = await supabase
        .from("ai_quote_generation_log")
        .select("book_id")
        .gte("generated_at", cutoff)
        .eq("status", "success");

      const recentSet = new Set((recentLogs ?? []).map((r: any) => r.book_id));
      const eligible = (textRows ?? []).filter((r: any) => !recentSet.has(r.book_id));

      // Shuffle and take up to `limit` books
      eligible.sort(() => Math.random() - 0.5);
      candidateBookIds = eligible.slice(0, limit).map((r: any) => r.book_id);
    }

    if (candidateBookIds.length === 0) {
      return new Response(
        JSON.stringify({ message: "No eligible books found", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetch book metadata
    const { data: books, error: booksErr } = await supabase
      .from("book_submissions")
      .select("id, title, author, cover_image_url, category, slug")
      .in("id", candidateBookIds)
      .eq("status", "approved");

    if (booksErr) throw booksErr;

    // Fetch text content
    const { data: texts, error: textsErr } = await supabase
      .from("book_extracted_text")
      .select("book_id, extracted_text")
      .in("book_id", candidateBookIds);

    if (textsErr) throw textsErr;

    const textMap = new Map<string, string>(
      (texts ?? []).map((t: any) => [t.book_id, t.extracted_text ?? ""]),
    );

    const results: any[] = [];

    for (const book of books ?? []) {
      const text = textMap.get(book.id);
      if (!text || text.length < 1000) {
        await supabase.from("ai_quote_generation_log").insert({
          book_id: book.id,
          quotes_generated: 0,
          status: "skipped",
          error_message: "no text",
        });
        continue;
      }

      try {
        const quotes = await generateQuotesForBook(MISTRAL_API_KEY, book as BookMeta, text);
        if (quotes.length === 0) {
          await supabase.from("ai_quote_generation_log").insert({
            book_id: book.id,
            quotes_generated: 0,
            status: "no_quotes",
          });
          continue;
        }

        // Insert quotes attributed to AI system user
        const inserts = quotes.map((q) => ({
          user_id: AI_USER_ID,
          quote_text: q,
          book_title: book.title,
          author_name: book.author,
          book_id: book.id,
          book_slug: book.slug,
          book_cover_url: book.cover_image_url,
          book_author: book.author,
          book_category: book.category,
          is_public: true,
        }));

        const { error: insertErr } = await supabase.from("quotes").insert(inserts);
        if (insertErr) {
          await supabase.from("ai_quote_generation_log").insert({
            book_id: book.id,
            quotes_generated: 0,
            status: "error",
            error_message: insertErr.message,
          });
          results.push({ book_id: book.id, error: insertErr.message });
          continue;
        }

        await supabase.from("ai_quote_generation_log").insert({
          book_id: book.id,
          quotes_generated: quotes.length,
          status: "success",
        });

        results.push({ book_id: book.id, title: book.title, quotes_generated: quotes.length });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error processing book ${book.id}:`, msg);
        await supabase.from("ai_quote_generation_log").insert({
          book_id: book.id,
          quotes_generated: 0,
          status: "error",
          error_message: msg.slice(0, 500),
        });
        results.push({ book_id: book.id, error: msg });
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("generate-ai-quotes fatal error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
