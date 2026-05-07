import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_BOT_USER_ID = "00000000-0000-0000-0000-00000000a1a1";

// تطبيع عربي شامل
function normalizeArabic(s: string): string {
  if (!s) return "";
  return s
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g, "")
    .replace(/[\u0640]/g, "")
    .replace(/[\u0623\u0625\u0622\u0671]/g, "\u0627")
    .replace(/[\u0649]/g, "\u064A")
    .replace(/[\u0629]/g, "\u0647")
    .replace(/[\u0624]/g, "\u0648")
    .replace(/[\u0626]/g, "\u064A")
    .toLowerCase()
    .trim();
}

const STOP_WORDS = new Set([
  "في", "من", "على", "الى", "عن", "هل", "ما", "ماذا", "كيف", "لماذا", "متى", "اين",
  "هو", "هي", "هذا", "هذه", "ذلك", "تلك", "ان", "كان", "يكون", "مع", "او",
  "و", "ثم", "قد", "لقد", "لا", "نعم", "كل", "بعض", "اي", "the", "a", "an", "is",
  "are", "what", "how", "why", "when", "where", "who", "and", "or", "of", "to", "in",
  "كتاب", "كتب", "مؤلف", "مؤلفه", "كاتب", "كاتبه", "اقرا", "اريد", "ابحث",
  "اعطني", "اخبرني", "حدثني", "ملخص", "محتوى", "موضوع", "رواية", "روايه", "روايات",
  "يتحدث", "يتكلم", "تتحدث", "موجود", "عندكم", "لديكم", "هناك", "يوجد", "متوفر",
  "للمؤلف", "للكاتب", "تاليف", "تأليف", "اسم", "اسماء", "افضل", "احسن", "اشهر",
  "شكرا", "السلام", "مرحبا", "اهلا", "صباح", "مساء", "الخير", "النور",
]);

function tokenize(text: string): string[] {
  return Array.from(
    new Set(
      normalizeArabic(text)
        .replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 2 && !STOP_WORDS.has(w))
    )
  );
}

interface BookCard {
  id: string;
  title: string;
  author: string;
  category: string | null;
  description: string | null;
  cover_image_url: string | null;
  slug: string | null;
  snippet?: string;
  score: number;
}

interface AuthorCard {
  id: string;
  name: string;
  slug: string | null;
  avatar_url: string | null;
  bio: string | null;
  books_count: number | null;
  score: number;
}

// كشف نية: هل المستخدم يطلب كتاب/مؤلف فعلاً؟
function detectIntent(message: string): { wantsBook: boolean; wantsAuthor: boolean; isGreeting: boolean } {
  const norm = normalizeArabic(message);
  const greetings = ["مرحبا", "اهلا", "السلام", "صباح", "مساء", "شكرا", "كيف حالك", "وداعا"];
  const isGreeting = greetings.some((g) => norm.includes(normalizeArabic(g))) && norm.length < 40;

  const bookSignals = ["كتاب", "كتب", "روايه", "رواية", "ملخص", "محتوى", "اقرا", "تحميل", "حمل", "ابحث عن", "هل يوجد", "هل عندكم", "هل لديكم", "متوفر", "موجود"];
  const authorSignals = ["مؤلف", "كاتب", "مؤلفه", "كاتبه", "للكاتب", "للمؤلف", "اعمال", "كتب الكاتب", "كتب المؤلف", "من هو", "من هي", "نبذه عن"];

  const wantsBook = bookSignals.some((s) => norm.includes(normalizeArabic(s)));
  const wantsAuthor = authorSignals.some((s) => norm.includes(normalizeArabic(s)));

  return { wantsBook, wantsAuthor, isGreeting };
}

// بحث ذكي عن مؤلفين بترتيب حسب الصلة (تطابق صارم)
async function findRelevantAuthors(supabase: any, userMessage: string, tokens: string[]): Promise<AuthorCard[]> {
  if (tokens.length === 0) return [];

  const orConditions = tokens.flatMap((kw) => [`name.ilike.%${kw}%`]).join(",");

  const { data } = await supabase
    .from("authors")
    .select("id, name, slug, avatar_url, bio, books_count, followers_count")
    .or(orConditions)
    .limit(30);

  if (!data || data.length === 0) return [];

  const fullQueryNorm = tokens.join(" ");

  const scored: AuthorCard[] = data.map((a: any) => {
    const normName = normalizeArabic(a.name || "");
    const nameTokens = normName.split(/\s+/).filter(Boolean);
    let matchedCount = 0;
    for (const tk of tokens) {
      if (nameTokens.some((nt: string) => nt === tk || nt.startsWith(tk) || tk.startsWith(nt))) {
        matchedCount += 1;
      }
    }
    let score = matchedCount * 15;
    // مكافأة قوية لتطابق الاسم الكامل
    if (normName === fullQueryNorm) score += 100;
    else if (normName.includes(fullQueryNorm) && fullQueryNorm.length >= 5) score += 60;
    // اشتراط تطابق كل الكلمات المعنوية للحصول على بطاقة
    const requiredMatches = Math.min(tokens.length, 2);
    if (matchedCount < requiredMatches) score = 0;

    return {
      id: a.id,
      name: a.name,
      slug: a.slug,
      avatar_url: a.avatar_url,
      bio: a.bio,
      books_count: a.books_count,
      score,
    };
  });

  return scored
    .filter((a) => a.score >= 30)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);
}

// جلب كتب مؤلف محدد
async function fetchBooksByAuthor(supabase: any, authorName: string): Promise<BookCard[]> {
  const { data } = await supabase
    .from("book_submissions")
    .select("id, title, author, category, description, cover_image_url, slug")
    .eq("status", "approved")
    .ilike("author", `%${authorName}%`)
    .limit(20);

  return (data || []).map((b: any) => ({
    id: b.id,
    title: b.title,
    author: b.author,
    category: b.category,
    description: b.description,
    cover_image_url: b.cover_image_url,
    slug: b.slug,
    score: 100,
  }));
}

// بحث عن كتب بالعنوان/الوصف/النص المستخرج
async function findRelevantBooks(supabase: any, tokens: string[]): Promise<BookCard[]> {
  if (tokens.length === 0) return [];

  const orConditions = tokens
    .flatMap((kw) => [`title.ilike.%${kw}%`, `description.ilike.%${kw}%`])
    .join(",");

  const { data: bookMatches } = await supabase
    .from("book_submissions")
    .select("id, title, author, category, description, cover_image_url, slug")
    .eq("status", "approved")
    .or(orConditions)
    .limit(30);

  // بحث في النص المستخرج (للكلمات الطويلة فقط لتفادي الضوضاء)
  const longTokens = tokens.filter((t) => t.length >= 4);
  let textMatches: any[] = [];
  if (longTokens.length > 0) {
    const textOr = longTokens.map((kw) => `extracted_text.ilike.%${kw}%`).join(",");
    const { data } = await supabase
      .from("book_extracted_text")
      .select("book_id, extracted_text")
      .eq("extraction_status", "completed")
      .or(textOr)
      .limit(5);
    textMatches = data || [];
  }

  const textMap = new Map<string, string>();
  textMatches.forEach((t: any) => textMap.set(t.book_id, t.extracted_text));

  const allIds = new Set<string>([
    ...(bookMatches || []).map((b: any) => b.id),
    ...textMatches.map((t: any) => t.book_id),
  ]);

  if (allIds.size === 0) return [];

  let allBooks = bookMatches || [];
  const missingIds = [...allIds].filter((id) => !allBooks.find((b: any) => b.id === id));
  if (missingIds.length > 0) {
    const { data: extra } = await supabase
      .from("book_submissions")
      .select("id, title, author, category, description, cover_image_url, slug")
      .in("id", missingIds)
      .eq("status", "approved");
    allBooks = [...allBooks, ...(extra || [])];
  }

  // حساب الصلة (تطابق صارم لتجنّب البطاقات العشوائية)
  const fullQuery = tokens.join(" ");
  const scored: BookCard[] = allBooks.map((b: any) => {
    const normTitle = normalizeArabic(b.title || "");
    const normDesc = normalizeArabic(b.description || "");
    const titleTokens = normTitle.split(/\s+/).filter(Boolean);
    let titleMatchCount = 0;
    for (const tk of tokens) {
      if (titleTokens.some((tt: string) => tt === tk || tt.startsWith(tk) || tk.startsWith(tt))) {
        titleMatchCount += 1;
      }
    }
    let score = titleMatchCount * 25;
    let descMatch = 0;
    for (const tk of tokens) {
      if (tk.length >= 4 && normDesc.includes(tk)) descMatch += 1;
    }
    score += descMatch * 3;

    if (normTitle === fullQuery) score += 200;
    else if (normTitle.includes(fullQuery) && fullQuery.length >= 4) score += 100;
    if (textMap.has(b.id)) score += 5;

    // اشتراط تطابق قوي مع العنوان
    if (tokens.length <= 2 && titleMatchCount < tokens.length) {
      score = Math.min(score, 25);
    }
    if (tokens.length >= 3 && titleMatchCount < 2 && descMatch < 2) {
      score = Math.min(score, 25);
    }

    let snippet = "";
    const fullText = textMap.get(b.id);
    if (fullText) {
      let matchIdx = -1;
      for (const kw of tokens) {
        const idx = fullText.toLowerCase().indexOf(kw.toLowerCase());
        if (idx !== -1) { matchIdx = idx; break; }
      }
      if (matchIdx === -1) matchIdx = 0;
      snippet = fullText
        .slice(Math.max(0, matchIdx - 150), Math.min(fullText.length, matchIdx + 800))
        .replace(/\s+/g, " ")
        .trim();
    }

    return {
      id: b.id,
      title: b.title,
      author: b.author,
      category: b.category,
      description: b.description,
      cover_image_url: b.cover_image_url,
      slug: b.slug,
      snippet,
      score,
    };
  });

  return scored.filter((b) => b.score >= 50).sort((a, b) => b.score - a.score).slice(0, 6);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MISTRAL_API_KEY = Deno.env.get("MISTRAL_API_KEY");
    if (!MISTRAL_API_KEY) throw new Error("MISTRAL_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const conversationId: string | undefined = body?.conversationId;
    let userMessage: string = (body?.userMessage || "").toString();
    const audioUrl: string | undefined = body?.audioUrl;
    const audioMimeType: string | undefined = body?.audioMimeType;
    const replyAsVoice: boolean = !!body?.replyAsVoice;
    const isVoiceInput: boolean = !!audioUrl;

    // إذا أُرسل صوت بدلاً من نص — حوّله إلى نص عبر Voxtral STT
    if (!userMessage && audioUrl) {
      try {
        const audioBlob = await fetch(audioUrl).then((r) => r.blob());
        const fd = new FormData();
        fd.append("model", "voxtral-mini-latest");
        fd.append("file", audioBlob, "voice.webm");
        fd.append("language", "ar");
        const sttResp = await fetch("https://api.mistral.ai/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${MISTRAL_API_KEY}` },
          body: fd,
        });
        if (sttResp.ok) {
          const sttJson = await sttResp.json();
          userMessage = (sttJson?.text || "").toString().trim();
        } else {
          console.warn("[ai-kotobi-chat] STT failed", sttResp.status, await sttResp.text());
        }
      } catch (e) {
        console.error("[ai-kotobi-chat] STT error", e);
      }
      if (!userMessage) userMessage = "(رسالة صوتية)";
    }

    if (!conversationId || !userMessage) {
      return new Response(JSON.stringify({ error: "Missing conversationId or userMessage" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: recentMessages } = await supabase
      .from("messages")
      .select("sender_id, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(20);

    const chatHistory = (recentMessages || []).reverse().map((msg) => ({
      role: msg.sender_id === AI_BOT_USER_ID ? "assistant" : "user",
      content: String(msg.content).replace(/<!--KOTOBI_CARDS:[\s\S]*?-->/g, "").trim(),
    }));

    const intent = detectIntent(userMessage);
    const tokens = tokenize(userMessage);

    console.log("Intent:", intent, "Tokens:", tokens);

    let relevantBooks: BookCard[] = [];
    let relevantAuthors: AuthorCard[] = [];

    // البحث فقط عند نية واضحة (طلب كتاب/مؤلف) أو وجود كلمة دلالية طويلة (اسم علم محتمل)
    const hasProperNoun = tokens.some((t) => t.length >= 4);
    const shouldSearch =
      !intent.isGreeting &&
      tokens.length > 0 &&
      (intent.wantsBook || intent.wantsAuthor || hasProperNoun);

    if (shouldSearch) {
      relevantAuthors = await findRelevantAuthors(supabase, userMessage, tokens);

      // مؤلف بثقة عالية جداً ⇒ اجلب كتبه مباشرة (لا بطاقات كتب أخرى)
      if (relevantAuthors.length > 0 && relevantAuthors[0].score >= 60) {
        relevantBooks = await fetchBooksByAuthor(supabase, relevantAuthors[0].name);
        relevantAuthors = relevantAuthors.slice(0, 1);
      } else {
        // استبعد بطاقات المؤلف الضعيفة تماماً
        relevantAuthors = relevantAuthors.filter((a) => a.score >= 60);
        relevantBooks = await findRelevantBooks(supabase, tokens);
      }
    }

    const [booksCountRes, authorsCountRes, extractedCountRes] = await Promise.all([
      supabase.from("book_submissions").select("*", { count: "exact", head: true }).eq("status", "approved"),
      supabase.from("authors").select("*", { count: "exact", head: true }),
      supabase.from("book_extracted_text").select("*", { count: "exact", head: true }).eq("extraction_status", "completed"),
    ]);

    const booksCount = booksCountRes.count;
    const authorsCount = authorsCountRes.count;
    const extractedCount = extractedCountRes.count;

    let booksContext = "";
    if (relevantAuthors.length > 0) {
      booksContext += "\n\n👤 مؤلف موجود في قاعدة بيانات كتبي (ستُعرض بطاقته تلقائياً):\n";
      relevantAuthors.forEach((a) => {
        booksContext += `- ${a.name}${a.books_count ? ` — ${a.books_count} كتاب على المنصة` : ""}\n`;
        if (a.bio) booksContext += `  نبذة: ${a.bio.slice(0, 250)}\n`;
      });
    }
    if (relevantBooks.length > 0) {
      booksContext += `\n\n📚 الكتب المتوفرة فعلياً في مكتبة كتبي والمتعلقة بالسؤال (${relevantBooks.length} كتاب — ستُعرض بطاقاتها تلقائياً):\n`;
      relevantBooks.forEach((b, i) => {
        booksContext += `${i + 1}. "${b.title}" — للمؤلف: ${b.author}${b.category ? ` (${b.category})` : ""}\n`;
        if (b.description) booksContext += `   وصف: ${b.description.slice(0, 200)}\n`;
        if (b.snippet) booksContext += `   مقتطف من النص: "${b.snippet.slice(0, 400)}"\n`;
      });
    }

    const hasResults = relevantBooks.length > 0 || relevantAuthors.length > 0;

    const systemPrompt = `أنت "AI KOTOBI" — المساعد الذكي الرسمي لمنصة كتبي (kotobi.xyz).

إحصائيات المنصة:
- ${booksCount || 0} كتاب معتمد ومتاح للقراءة
- ${authorsCount || 0} مؤلف
- ${extractedCount || 0} كتاب نصوصها مستخرجة بالكامل (تستطيع الاستشهاد بمحتواها)

🚨 قواعد صارمة جداً (ممنوع مخالفتها):

1. **ممنوع منعاً باتاً اختراع أي عنوان كتاب أو اسم مؤلف**. لا تذكر أي كتاب إلا إذا كان موجوداً حرفياً في قائمة "الكتب المتوفرة فعلياً" أدناه.

2. **عند ذكر اسم مؤلف**:
   - إذا كان موجوداً في قائمة "مؤلف موجود" أدناه: أكّد أنه موجود واذكر فقط الكتب المُدرجة في قائمتنا. **لا تخترع عناوين أخرى له من معرفتك العامة**.
   - إذا لم يكن موجوداً: قل بصراحة "هذا المؤلف غير مسجَّل حالياً في مكتبة كتبي".

3. **عند طلب كتاب محدد**:
   - إذا وجدته في القائمة: أكّد توفّره واذكر مؤلفه ووصفاً مختصراً.
   - إذا لم تجده: قل "هذا الكتاب غير متوفر حالياً على كتبي" — ولا تقترح كتباً مخترعة.

4. **بطاقات الكتب والمؤلفين تُولَّد تلقائياً** تحت ردك. لا تكتب روابط، لا تطلب من المستخدم البحث بنفسه، ولا تذكر أنه "يمكنه إيجادها في الموقع".

5. **للأسئلة العامة** (تحية، شكر، استفسار عن المنصة): أجب بلطف بدون قوائم كتب.

6. أسلوبك: عربي فصيح بسيط، ودود، مباشر، بدون إطالة.

7. **نوع رسالة المستخدم الحالية**: ${isVoiceInput ? "🎤 رسالة صوتية (تم تفريغها إلى نص أعلاه)." : "✍️ رسالة مكتوبة عادية."}
   - ${isVoiceInput
       ? "يمكنك الإشارة بإيجاز إلى أنك استمعت إلى صوته إن كان مناسباً، لكن دون مبالغة."
       : "**ممنوع منعاً باتاً** أن تصف صوت المستخدم أو تذكر أنه أرسل لك صوتاً أو تستخدم عبارات مثل \"صوتك ناعم\" أو \"همسة\" أو \"كالحرير\" أو أي وصف صوتي. هو أرسل نصاً مكتوباً فقط — رد عليه نصياً بشكل طبيعي."}
   - لا تصف صوتك أنت أيضاً ولا تتحدث عن نبرتك إلا إذا سُئلت صراحة.
${hasResults ? booksContext : "\n\n⚠️ لا توجد نتائج مطابقة في قاعدة البيانات لهذا السؤال — أجب بصدق."}`;

    const aiResponse = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MISTRAL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "mistral-large-latest",
        messages: [
          { role: "system", content: systemPrompt },
          ...chatHistory,
          { role: "user", content: userMessage },
        ],
        max_tokens: 1500,
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("Mistral API error:", aiResponse.status, errText);
      throw new Error(`Mistral API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let aiReply: string =
      aiData.choices?.[0]?.message?.content || "عذراً، لم أتمكن من الرد. حاول مرة أخرى.";

    // إلحاق البطاقات فقط عند وجود نتائج فعلية
    const cardsPayload = {
      books: relevantBooks.map((b) => ({
        id: b.id,
        title: b.title,
        author: b.author,
        category: b.category,
        cover_image_url: b.cover_image_url,
        slug: b.slug,
      })),
      authors: relevantAuthors.map((a) => ({
        id: a.id,
        name: a.name,
        slug: a.slug,
        avatar_url: a.avatar_url,
        books_count: a.books_count,
      })),
    };

    if (cardsPayload.books.length > 0 || cardsPayload.authors.length > 0) {
      aiReply += `\n\n<!--KOTOBI_CARDS:${JSON.stringify(cardsPayload)}-->`;
    }

    // ===== توليد رد صوتي عبر ElevenLabs إذا طُلب ذلك =====
    let voicePayload: { audio_url: string; audio_mime_type: string } | null = null;
    if (replyAsVoice) {
      try {
        const ELEVEN_KEY = Deno.env.get("ELEVENLABS_API_KEY");
        const cleanReply = aiReply
          .replace(/<!--KOTOBI_CARDS:[\s\S]*?-->/g, " ")
          .replace(/[*_~#>|=`]+/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 1500);
        if (ELEVEN_KEY && cleanReply) {
          const ttsResp = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/JBFqnCBsd6RMkjVDRZzb?output_format=mp3_44100_128`,
            {
              method: "POST",
              headers: {
                "xi-api-key": ELEVEN_KEY,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                text: cleanReply,
                model_id: "eleven_multilingual_v2",
                voice_settings: {
                  stability: 0.5,
                  similarity_boost: 0.8,
                  style: 0.2,
                  use_speaker_boost: true,
                  speed: 1.05,
                },
              }),
            },
          );
          if (ttsResp.ok) {
            const buf = new Uint8Array(await ttsResp.arrayBuffer());
            const path = `${AI_BOT_USER_ID}/${Date.now()}-${crypto.randomUUID().slice(0, 6)}.mp3`;
            const { error: upErr } = await supabase.storage
              .from("voice-messages")
              .upload(path, buf, { contentType: "audio/mpeg", upsert: false });
            if (!upErr) {
              const { data: pub } = supabase.storage.from("voice-messages").getPublicUrl(path);
              voicePayload = { audio_url: pub.publicUrl, audio_mime_type: "audio/mpeg" };
            } else {
              console.error("[ai-kotobi-chat] storage upload error", upErr);
            }
          } else {
            console.warn("[ai-kotobi-chat] ElevenLabs error", ttsResp.status, (await ttsResp.text()).slice(0, 300));
          }
        }
      } catch (e) {
        console.error("[ai-kotobi-chat] TTS error", e);
      }
    }

    const { error: insertError } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: AI_BOT_USER_ID,
      content: aiReply,
      is_read: false,
      message_type: voicePayload ? "audio" : "text",
      audio_url: voicePayload?.audio_url ?? null,
      audio_mime_type: voicePayload?.audio_mime_type ?? null,
      transcript: voicePayload ? aiReply : null,
    });

    if (insertError) {
      console.error("Error inserting bot message:", insertError);
      throw insertError;
    }

    await supabase
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversationId);

    return new Response(
      JSON.stringify({
        reply: aiReply,
        sourcesCount: relevantBooks.length,
        authorsCount: relevantAuthors.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("ai-kotobi-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
