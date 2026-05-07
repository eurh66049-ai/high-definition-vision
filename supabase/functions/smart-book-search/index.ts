import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface SearchLocation {
  page: number;
  sentence: string;
}

/**
 * Strong Arabic normalization:
 * - Remove diacritics (tashkeel)
 * - Normalize alef forms (أ إ آ ٱ → ا)
 * - Normalize ya (ى → ي), ta marbuta (ة → ه)
 * - Remove tatweel (ـ)
 * - Normalize hamza forms (ؤ → و, ئ → ي)
 * - Collapse whitespace
 */
function normalizeArabic(s: string): string {
  if (!s) return '';
  return s
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g, '') // diacritics
    .replace(/[\u0640]/g, '') // tatweel
    .replace(/[\u0623\u0625\u0622\u0671]/g, '\u0627') // alef variants → ا
    .replace(/[\u0649]/g, '\u064A') // ى → ي
    .replace(/[\u0629]/g, '\u0647') // ة → ه
    .replace(/[\u0624]/g, '\u0648') // ؤ → و
    .replace(/[\u0626]/g, '\u064A') // ئ → ي
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/**
 * Build a normalized text along with an offset map: normalizedIndex → originalIndex.
 * This lets us search on normalized text but recover the original position.
 */
function buildNormalizedWithMap(text: string): { normalized: string; map: number[] } {
  const map: number[] = [];
  let normalized = '';
  let prevWasSpace = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const code = ch.charCodeAt(0);

    // Skip diacritics, tatweel
    if (
      (code >= 0x0610 && code <= 0x061A) ||
      (code >= 0x064B && code <= 0x065F) ||
      code === 0x0670 ||
      (code >= 0x06D6 && code <= 0x06DC) ||
      (code >= 0x06DF && code <= 0x06E8) ||
      (code >= 0x06EA && code <= 0x06ED) ||
      code === 0x0640
    ) {
      continue;
    }

    let out = ch;
    if (ch === 'أ' || ch === 'إ' || ch === 'آ' || ch === 'ٱ') out = 'ا';
    else if (ch === 'ى') out = 'ي';
    else if (ch === 'ة') out = 'ه';
    else if (ch === 'ؤ') out = 'و';
    else if (ch === 'ئ') out = 'ي';
    else if (/\s/.test(ch)) out = ' ';
    else out = ch.toLowerCase();

    if (out === ' ') {
      if (prevWasSpace) continue;
      prevWasSpace = true;
    } else {
      prevWasSpace = false;
    }

    normalized += out;
    map.push(i);
  }

  return { normalized, map };
}

function extractPageFromMarkers(text: string, position: number): number {
  const pageMarkerRegex = /---\s*صفحة\s*(\d+)\s*---/g;
  let currentPage = 1;
  let match;
  while ((match = pageMarkerRegex.exec(text)) !== null) {
    if (match.index <= position) currentPage = parseInt(match[1], 10);
    else break;
  }
  return currentPage;
}

function extractSentence(text: string, matchStart: number, matchEnd: number): string {
  const breakers = /[.!?؟\n]/;
  let start = matchStart;
  for (let i = matchStart - 1; i >= Math.max(0, matchStart - 250); i--) {
    if (breakers.test(text[i]) || text.substring(i, i + 10).match(/---\s*صفحة/)) {
      start = i + 1;
      break;
    }
    start = i;
  }
  let end = matchEnd;
  for (let i = matchEnd; i < Math.min(text.length, matchEnd + 250); i++) {
    if (breakers.test(text[i]) || text.substring(i, i + 10).match(/---\s*صفحة/)) {
      end = i;
      break;
    }
    end = i + 1;
  }
  return text.substring(start, end).replace(/\s+/g, ' ').trim();
}

/**
 * Generate query variants: with/without ال التعريف, basic plural/singular hints.
 */
function buildQueryVariants(query: string): string[] {
  const variants = new Set<string>();
  const base = query.trim();
  variants.add(base);
  // Without leading ال
  if (base.startsWith('ال') && base.length > 3) variants.add(base.substring(2));
  // With leading ال
  if (!base.startsWith('ال')) variants.add('ال' + base);
  // Strip common suffixes (ون, ين, ات, ه, ها, هم) for stem-like match
  const suffixes = ['ون', 'ين', 'ات', 'ها', 'هم', 'كم', 'نا', 'ه', 'ة'];
  for (const suf of suffixes) {
    if (base.endsWith(suf) && base.length - suf.length >= 3) {
      variants.add(base.substring(0, base.length - suf.length));
    }
  }
  return Array.from(variants);
}

/**
 * Powerful normalized search across the book using all query variants.
 * Returns deduplicated locations (by page + sentence).
 */
function powerfulSearch(bookText: string, query: string): SearchLocation[] {
  const locations: SearchLocation[] = [];
  const seen = new Set<string>();
  const { normalized, map } = buildNormalizedWithMap(bookText);

  const variants = buildQueryVariants(query);
  // Sort by length desc so longest match first
  variants.sort((a, b) => b.length - a.length);

  for (const variant of variants) {
    const normVariant = normalizeArabic(variant);
    if (!normVariant || normVariant.length < 2) continue;

    let pos = 0;
    let safety = 0;
    while (safety++ < 10000) {
      const idx = normalized.indexOf(normVariant, pos);
      if (idx === -1) break;

      const origStart = map[idx] ?? 0;
      const origEnd = (map[idx + normVariant.length - 1] ?? origStart) + 1;
      const page = extractPageFromMarkers(bookText, origStart);
      const sentence = extractSentence(bookText, origStart, origEnd);

      const key = `${page}::${sentence.substring(0, 80)}`;
      if (!seen.has(key) && sentence.length > 0) {
        seen.add(key);
        locations.push({ page, sentence });
      }

      pos = idx + 1;
      if (locations.length >= 200) break;
    }

    if (locations.length >= 200) break;
  }

  // Sort by page
  locations.sort((a, b) => a.page - b.page);
  return locations;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, bookText: clientBookText, bookTitle, bookAuthor, bookId } = await req.json();

    if (!query) {
      return new Response(JSON.stringify({ error: 'query is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 0: Try to fetch the COMPLETE extracted text from DB by bookId.
    // This is more reliable than the truncated client-extracted text.
    let bookText = clientBookText || '';
    if (bookId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data: stored } = await supabase
          .from('book_extracted_text')
          .select('extracted_text, extraction_status')
          .eq('book_id', bookId)
          .maybeSingle();

        if (stored?.extraction_status === 'completed' && stored?.extracted_text) {
          // Use the stored text — it's the full book
          bookText = stored.extracted_text;
          console.log(`✅ Using stored text for book ${bookId}: ${bookText.length} chars`);
        }
      } catch (e) {
        console.warn('⚠️ Could not fetch stored text:', e);
      }
    }

    if (!bookText || bookText.trim().length < 10) {
      return new Response(JSON.stringify({
        found: false,
        answer: 'لا يوجد نص متاح للبحث في هذا الكتاب',
        quotes: [], pages: [], confidence: 0,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Step 1: Powerful normalized search (handles diacritics, alef, ya, ta marbuta, ال, etc.)
    const directResults = powerfulSearch(bookText, query.trim());

    if (directResults.length > 0) {
      const result = {
        found: true,
        answer: `تم العثور على "${query}" في ${directResults.length} موضع`,
        quotes: directResults.map(l => l.sentence),
        pages: [...new Set(directResults.map(l => l.page))],
        confidence: 1.0,
      };
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 2: AI semantic fallback for non-literal matches (synonyms, related concepts)
    const MISTRAL_API_KEY = Deno.env.get('MISTRAL_API_KEY');
    if (!MISTRAL_API_KEY) {
      return new Response(JSON.stringify({
        found: false,
        answer: 'لم يتم العثور على النص المطلوب',
        quotes: [], pages: [], confidence: 0,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const maxChars = 60000;
    const textForAI = bookText.length > maxChars ? bookText.substring(0, maxChars) : bookText;

    const systemPrompt = `أنت أداة بحث نصي ذكية فائقة الدقة. مهمتك إيجاد كلمة أو عبارة في نص الكتاب حتى لو كانت بصيغ مختلفة أو مفاهيم مرادفة.
الكتاب: "${bookTitle || ''}" - "${bookAuthor || ''}"

تعليمات:
1. ابحث عن تطابق حرفي أو أشكال مشابهة (مع/بدون التشكيل، مع/بدون "ال"، صيغ الجمع/المفرد/الاشتقاقات، المرادفات القريبة).
2. حدد رقم الصفحة من علامات "--- صفحة X ---" قبل الموضع.
3. اقتبس الجملة الكاملة التي تحتوي على الكلمة/المفهوم.
4. أعد كل المواضع التي تجدها.
5. إذا لم تجد شيئاً قل found: false.

أجب بJSON فقط:
{"found": true/false, "locations": [{"page": رقم, "sentence": "الجملة"}], "total": عدد}`;

    const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MISTRAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `النص:\n${textForAI}\n\nابحث عن: "${query}"` }
        ],
        max_tokens: 4000,
        temperature: 0.0,
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      return new Response(JSON.stringify({
        found: false, answer: 'لم يتم العثور على النص المطلوب',
        quotes: [], pages: [], confidence: 0,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    try {
      const parsed = JSON.parse(content);
      if (parsed?.found && parsed.locations?.length > 0) {
        const valid = parsed.locations.filter((l: any) => l.page && l.sentence);
        return new Response(JSON.stringify({
          found: valid.length > 0,
          answer: valid.length > 0
            ? `تم العثور على "${query}" في ${valid.length} موضع`
            : 'لم يتم العثور على النص المطلوب',
          quotes: valid.map((l: any) => l.sentence),
          pages: [...new Set(valid.map((l: any) => l.page))],
          confidence: 0.8,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    } catch {
      // ignore
    }

    return new Response(JSON.stringify({
      found: false,
      answer: 'لم يتم العثور على النص المطلوب في هذا الكتاب',
      quotes: [], pages: [], confidence: 0,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('smart-book-search error:', error);
    return new Response(JSON.stringify({ error: 'حدث خطأ في البحث' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
