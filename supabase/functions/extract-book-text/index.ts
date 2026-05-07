import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// إعدادات معالجة الكتب الكبيرة
const PAGES_PER_CHUNK = 50;        // عدد الصفحات في كل دفعة OCR
const MAX_TOTAL_PAGES = 5000;      // سقف أمان عام (يكفي حتى لأكبر الكتب)
const DELAY_BETWEEN_CHUNKS_MS = 800;

/**
 * استدعاء Mistral OCR مع إعادة محاولة تلقائية لأخطاء 429 و 5xx
 */
async function callMistralOcrWithRetry(
  apiKey: string,
  body: Record<string, unknown>,
  maxRetries = 5
): Promise<{ ok: boolean; data?: any; error?: string; status?: number }> {
  const delays = [1000, 3000, 7000, 15000, 30000];

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('https://api.mistral.ai/v1/ocr', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const data = await response.json();
        return { ok: true, data, status: response.status };
      }

      const errorText = await response.text();
      const isRetryable = response.status === 429 || response.status >= 500;

      if (!isRetryable || attempt === maxRetries) {
        return {
          ok: false,
          error: `Mistral OCR error: ${response.status} - ${errorText.substring(0, 200)}`,
          status: response.status,
        };
      }

      const retryAfterHeader = response.headers.get('retry-after');
      const retryAfterMs = retryAfterHeader
        ? parseInt(retryAfterHeader) * 1000
        : delays[attempt];

      console.log(`⏳ Mistral ${response.status} - retrying in ${retryAfterMs}ms (attempt ${attempt + 1}/${maxRetries})`);
      await sleep(retryAfterMs);
    } catch (err) {
      if (attempt === maxRetries) {
        return {
          ok: false,
          error: `Network error: ${err instanceof Error ? err.message : 'Unknown'}`,
        };
      }
      await sleep(delays[attempt]);
    }
  }

  return { ok: false, error: 'Max retries exhausted' };
}

/**
 * تنظيف وترتيب النص المستخرج من OCR
 * - إزالة الأسطر الفارغة المتكررة
 * - تطبيع المسافات
 * - الحفاظ على الفقرات
 * - إزالة الأحرف الغريبة من OCR
 */
function cleanAndFormatText(text: string): string {
  if (!text) return '';

  return text
    // تطبيع نهايات الأسطر
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // إزالة المسافات في نهاية الأسطر
    .replace(/[ \t]+\n/g, '\n')
    // إزالة المسافات المتعددة (لكن الإبقاء على واحدة)
    .replace(/[ \t]{2,}/g, ' ')
    // ضغط الأسطر الفارغة المتكررة (3+ → 2)
    .replace(/\n{3,}/g, '\n\n')
    // إزالة أحرف التحكم غير المرئية
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim();
}

/**
 * استخراج نص الصفحة من نتيجة Mistral OCR
 */
function extractPageText(page: any): string {
  return page?.markdown || page?.text || '';
}

/**
 * معالجة دفعة واحدة من الصفحات
 */
async function processChunk(
  apiKey: string,
  documentUrl: string,
  startPage: number,
  endPage: number
): Promise<{ ok: boolean; pages: Array<{ index: number; text: string }>; error?: string }> {
  // Mistral OCR pages parameter: array of 0-indexed page numbers
  const pagesArray: number[] = [];
  for (let i = startPage; i <= endPage; i++) {
    pagesArray.push(i);
  }

  const result = await callMistralOcrWithRetry(apiKey, {
    model: 'mistral-ocr-latest',
    document: {
      type: 'document_url',
      document_url: documentUrl,
    },
    pages: pagesArray,
    include_image_base64: false,
    image_limit: 0,
  });

  if (!result.ok) {
    return { ok: false, pages: [], error: result.error };
  }

  const ocrPages = result.data?.pages || [];
  const pages: Array<{ index: number; text: string }> = [];

  for (const page of ocrPages) {
    // page.index هو رقم الصفحة الأصلي (0-indexed) في الوثيقة
    const pageIndex = typeof page.index === 'number' ? page.index : startPage + pages.length;
    const text = extractPageText(page);
    if (text.trim()) {
      pages.push({ index: pageIndex, text });
    }
  }

  return { ok: true, pages };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MISTRAL_API_KEY = Deno.env.get('MISTRAL_API_KEY');
    if (!MISTRAL_API_KEY) {
      throw new Error('MISTRAL_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { bookId, imageUrls, bookTable = 'approved_books' } = await req.json();

    if (!bookId) {
      throw new Error('bookId is required');
    }

    // تحديث الحالة إلى "قيد المعالجة"
    await supabase
      .from('book_extracted_text')
      .upsert({
        book_id: bookId,
        extraction_status: 'processing',
        extracted_text: null,
        extraction_error: null,
        text_length: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'book_id' });

    const { data: book, error: bookError } = await supabase
      .from(bookTable)
      .select('book_file_url, cover_image_url, title')
      .eq('id', bookId)
      .single();

    if (bookError || !book) {
      throw new Error(`Book not found: ${bookError?.message || 'Unknown error'}`);
    }

    const documentUrl = book.book_file_url;
    const fallbackImages: string[] = imageUrls || [];

    // خريطة كل الصفحات المستخرجة (مرتبة لاحقاً حسب index)
    const allPages: Array<{ index: number; text: string }> = [];
    const errors: string[] = [];

    if (documentUrl) {
      console.log(`📄 بدء OCR للكتاب "${book.title}" - URL: ${documentUrl.substring(0, 80)}...`);

      // === الخطوة 1: محاولة استخراج كامل أولاً (للكتب الصغيرة-المتوسطة) ===
      // هذا يحدد عدد الصفحات الإجمالي ويعالج معظم الكتب في طلب واحد
      console.log(`🔍 محاولة استخراج أولية لمعرفة عدد الصفحات...`);
      const initialResult = await callMistralOcrWithRetry(MISTRAL_API_KEY, {
        model: 'mistral-ocr-latest',
        document: {
          type: 'document_url',
          document_url: documentUrl,
        },
        include_image_base64: false,
        image_limit: 0,
      });

      let totalPagesInDoc = 0;
      let processedAllInOne = false;

      if (initialResult.ok) {
        const ocrPages = initialResult.data?.pages || [];
        totalPagesInDoc = ocrPages.length;
        console.log(`📊 تم استخراج ${totalPagesInDoc} صفحة في الطلب الأول`);

        for (const page of ocrPages) {
          const pageIndex = typeof page.index === 'number' ? page.index : allPages.length;
          const text = extractPageText(page);
          if (text.trim()) {
            allPages.push({ index: pageIndex, text });
          }
        }

        // إذا حصلنا على صفحات معقولة في الطلب الأول، نعتبر العملية ناجحة
        // لكن إذا كان عدد الصفحات = حد الـ chunk بالضبط، قد يكون الكتاب أكبر
        processedAllInOne = totalPagesInDoc > 0 && totalPagesInDoc < PAGES_PER_CHUNK;
      } else {
        errors.push(`Initial OCR error: ${initialResult.error}`);
        console.error(`❌ فشل الاستخراج الأولي: ${initialResult.error}`);
      }

      // === الخطوة 2: إذا الكتاب كبير، تابع المعالجة بدفعات ===
      if (initialResult.ok && !processedAllInOne && totalPagesInDoc > 0) {
        console.log(`📚 الكتاب كبير - بدء المعالجة بدفعات من الصفحة ${totalPagesInDoc}...`);

        let nextStartPage = totalPagesInDoc;
        let consecutiveEmptyChunks = 0;

        while (nextStartPage < MAX_TOTAL_PAGES && consecutiveEmptyChunks < 2) {
          const endPage = Math.min(nextStartPage + PAGES_PER_CHUNK - 1, MAX_TOTAL_PAGES - 1);
          console.log(`🔄 معالجة الصفحات ${nextStartPage} - ${endPage}...`);

          const chunkResult = await processChunk(
            MISTRAL_API_KEY,
            documentUrl,
            nextStartPage,
            endPage
          );

          if (!chunkResult.ok) {
            // خطأ يعني غالباً أننا تجاوزنا نهاية الكتاب
            console.log(`⚠️ خطأ في الدفعة (${nextStartPage}-${endPage}): ${chunkResult.error}`);
            errors.push(`Chunk ${nextStartPage}-${endPage}: ${chunkResult.error}`);
            break;
          }

          if (chunkResult.pages.length === 0) {
            consecutiveEmptyChunks++;
            console.log(`📭 دفعة فارغة (${consecutiveEmptyChunks}/2)`);
          } else {
            consecutiveEmptyChunks = 0;
            allPages.push(...chunkResult.pages);
            console.log(`✅ تمت إضافة ${chunkResult.pages.length} صفحة (الإجمالي: ${allPages.length})`);
          }

          // إذا الدفعة أصغر من المتوقع، فقد وصلنا للنهاية
          if (chunkResult.pages.length < PAGES_PER_CHUNK) {
            console.log(`🏁 الدفعة أصغر من الحد - الوصول لنهاية الكتاب على الأرجح`);
            // نواصل دفعة إضافية للتأكد، ثم نخرج
            if (chunkResult.pages.length === 0) break;
          }

          nextStartPage = endPage + 1;

          // فاصل صغير لتجنب rate limits
          await sleep(DELAY_BETWEEN_CHUNKS_MS);
        }
      }

      console.log(`✅ Mistral OCR: تم استخراج ${allPages.length} صفحة إجمالاً`);
    }

    // === Fallback: OCR على الصور إذا لم نحصل على نص من الوثيقة ===
    if (allPages.length === 0 && (fallbackImages.length > 0 || book.cover_image_url)) {
      const imagesToProcess = fallbackImages.length > 0
        ? fallbackImages
        : [book.cover_image_url].filter(Boolean) as string[];

      console.log(`🖼️ Fallback: OCR على ${imagesToProcess.length} صورة`);

      for (let i = 0; i < imagesToProcess.length; i++) {
        const imageUrl = imagesToProcess[i];
        const result = await callMistralOcrWithRetry(MISTRAL_API_KEY, {
          model: 'mistral-ocr-latest',
          document: {
            type: 'image_url',
            image_url: imageUrl,
          },
          include_image_base64: false,
        });

        if (!result.ok) {
          errors.push(`Image OCR error: ${result.error}`);
          continue;
        }

        const pages = result.data?.pages || [];
        for (const page of pages) {
          const text = extractPageText(page);
          if (text.trim()) {
            allPages.push({ index: allPages.length, text });
          }
        }

        await sleep(500);
      }
    }

    // === ترتيب الصفحات وتجميع النص النهائي ===
    allPages.sort((a, b) => a.index - b.index);

    // إزالة التكرار (في حال تداخلت الدفعات)
    const seenIndices = new Set<number>();
    const uniquePages = allPages.filter((p) => {
      if (seenIndices.has(p.index)) return false;
      seenIndices.add(p.index);
      return true;
    });

    let finalText = '';
    let pageNumber = 0;
    for (const page of uniquePages) {
      const cleaned = cleanAndFormatText(page.text);
      if (cleaned) {
        pageNumber++;
        finalText += `\n--- صفحة ${pageNumber} ---\n${cleaned}\n`;
      }
    }

    finalText = finalText.trim();

    const finalStatus = finalText ? 'completed' : 'failed';
    const finalError = errors.length > 0 && !finalText
      ? errors.join('; ').substring(0, 1000)
      : null;

    await supabase
      .from('book_extracted_text')
      .upsert({
        book_id: bookId,
        extracted_text: finalText || null,
        extraction_status: finalStatus,
        extraction_error: finalError,
        text_length: finalText.length,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'book_id' });

    const success = finalStatus === 'completed';
    console.log(`${success ? '✅' : '❌'} اكتمل: ${pageNumber} صفحة، ${finalText.length} حرف`);

    return new Response(
      JSON.stringify({
        success,
        bookId,
        processedPages: pageNumber,
        textLength: finalText.length,
        status: finalStatus,
        error: success ? undefined : (finalError || 'لم يتم استخراج أي نص من الكتاب'),
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Extract text error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
