import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const TEMP_BUCKET = 'book-uploads';
const TEMP_FOLDER = 'temp-extract';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let tempFilePath: string | null = null;
  let supabase: any = null;

  try {
    const MISTRAL_API_KEY = Deno.env.get('MISTRAL_API_KEY');
    if (!MISTRAL_API_KEY) {
      throw new Error('MISTRAL_API_KEY غير مهيأ');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    supabase = createClient(supabaseUrl, supabaseKey);

    const contentType = req.headers.get('content-type') || '';

    let file: File | null = null;
    let cachedText = '';
    let bookTitle = '';
    let bookAuthor = '';
    let bookCategory = '';
    let bookLanguage = 'العربية';

    if (contentType.includes('application/json')) {
      // 📦 JSON payload — للحالة التي يوجد فيها نص مخزّن مسبقاً (بدون ملف)
      const body = await req.json();
      cachedText = body.cachedText || '';
      bookTitle = body.bookTitle || '';
      bookAuthor = body.bookAuthor || '';
      bookCategory = body.bookCategory || '';
      bookLanguage = body.bookLanguage || 'العربية';
    } else if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      file = form.get('file') as File | null;
      cachedText = (form.get('cachedText') as string | null) || '';
      bookTitle = (form.get('bookTitle') as string | null) || '';
      bookAuthor = (form.get('bookAuthor') as string | null) || '';
      bookCategory = (form.get('bookCategory') as string | null) || '';
      bookLanguage = (form.get('bookLanguage') as string | null) || 'العربية';
    } else {
      throw new Error('يجب إرسال البيانات بصيغة multipart/form-data أو application/json');
    }

    console.log(`📥 استلام طلب — cachedText: ${cachedText.length} حرف, file: ${file ? file.name : 'لا يوجد'}`);

    let trimmedText = '';
    let processedPages = 0;

    // ⚡ المسار السريع: إذا تم تمرير نص مخزّن مسبقاً، نتخطى OCR كاملاً
    if (cachedText && cachedText.trim().length > 100) {
      trimmedText = cachedText.trim();
      // عدّ تقريبي للصفحات حسب فواصل "--- صفحة"
      const pageMatches = trimmedText.match(/--- صفحة \d+ ---/g);
      processedPages = pageMatches?.length || Math.ceil(trimmedText.length / 1500);
      console.log(`♻️ استخدام نص مخزّن مسبقاً: ${trimmedText.length} حرف`);
    } else {
      if (!file) {
        throw new Error('لم يتم إرسال ملف الكتاب');
      }

      // التحقق من حجم الملف (50 ميجا حد أقصى)
      if (file.size > 50 * 1024 * 1024) {
        throw new Error('حجم الملف كبير جداً (الحد الأقصى 50 ميجابايت)');
      }

      // رفع الملف مؤقتاً للحصول على رابط عام لـ Mistral OCR
      const ext = (file.name.split('.').pop() || 'pdf').toLowerCase();
      const uniqueId = crypto.randomUUID();
      tempFilePath = `${TEMP_FOLDER}/${uniqueId}.${ext}`;

      console.log(`📤 رفع الملف مؤقتاً: ${tempFilePath} (${file.size} bytes)`);

      const fileBytes = new Uint8Array(await file.arrayBuffer());
      const { error: uploadError } = await supabase.storage
        .from(TEMP_BUCKET)
        .upload(tempFilePath, fileBytes, {
          contentType: file.type || 'application/pdf',
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`فشل رفع الملف المؤقت: ${uploadError.message}`);
      }

      const { data: publicUrlData } = supabase.storage
        .from(TEMP_BUCKET)
        .getPublicUrl(tempFilePath);

      const documentUrl = publicUrlData.publicUrl;
      console.log(`📄 جاري تشغيل Mistral OCR على: ${documentUrl.substring(0, 100)}...`);

      // استدعاء Mistral OCR
      const ocrResponse = await fetch('https://api.mistral.ai/v1/ocr', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MISTRAL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'mistral-ocr-latest',
          document: {
            type: 'document_url',
            document_url: documentUrl,
          },
          include_image_base64: false,
          image_limit: 0,
        }),
      });

      if (!ocrResponse.ok) {
        const errText = await ocrResponse.text();
        console.error('Mistral OCR error:', ocrResponse.status, errText);
        throw new Error(`فشل استخراج النص من الكتاب (${ocrResponse.status})`);
      }

      const ocrData = await ocrResponse.json();
      const pages = ocrData.pages || [];

      let allText = '';
      for (const page of pages) {
        const pageText = page.markdown || page.text || '';
        if (pageText.trim()) {
          processedPages++;
          allText += `\n--- صفحة ${processedPages} ---\n${pageText}\n`;
        }
      }

      trimmedText = allText.trim();
      console.log(`✅ تم استخراج ${processedPages} صفحة، ${trimmedText.length} حرف`);

      if (!trimmedText) {
        throw new Error('لم يتم العثور على نص قابل للاستخراج في الكتاب');
      }
    }

    // اقتطاع النص للوصف (أول ~12000 حرف لتجنب تجاوز الحدود)
    const excerptForPrompt = trimmedText.substring(0, 12000);

    // توليد الوصف عبر Mistral chat
    const promptParts = [
      `أنت كاتب محترف متخصص في كتابة أوصاف الكتب باللغة العربية.`,
      `بناءً على النص المستخرج التالي من كتاب، اكتب وصفاً جذاباً ومشوقاً يعكس محتوى الكتاب الفعلي.`,
      ``,
      `معلومات الكتاب:`,
      bookTitle ? `- العنوان: "${bookTitle}"` : '',
      bookAuthor ? `- المؤلف: "${bookAuthor}"` : '',
      bookCategory ? `- التصنيف: "${bookCategory}"` : '',
      bookLanguage ? `- اللغة: "${bookLanguage}"` : '',
      ``,
      `متطلبات الوصف:`,
      `- بين 100 و 200 كلمة`,
      `- يبرز أهمية وقيمة الكتاب الفعلية بناءً على محتواه`,
      `- يثير فضول القارئ دون الإفصاح عن كل شيء`,
      `- باللغة العربية الفصحى`,
      `- اكتب الوصف فقط بدون أي عناوين أو إضافات أخرى`,
      ``,
      `النص المستخرج من الكتاب:`,
      `"""`,
      excerptForPrompt,
      `"""`,
    ].filter(Boolean).join('\n');

    console.log('🤖 جاري توليد الوصف بواسطة Mistral...');
    const chatResponse = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MISTRAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages: [
          {
            role: 'system',
            content: 'أنت كاتب محترف متخصص في كتابة أوصاف الكتب العربية. اكتب أوصافاً جذابة ومشوقة بناءً على محتوى الكتاب الفعلي.',
          },
          { role: 'user', content: promptParts },
        ],
        max_tokens: 600,
        temperature: 0.7,
      }),
    });

    if (!chatResponse.ok) {
      const errText = await chatResponse.text();
      console.error('Mistral chat error:', chatResponse.status, errText);
      throw new Error(`فشل توليد الوصف (${chatResponse.status})`);
    }

    const chatData = await chatResponse.json();
    const description = chatData.choices?.[0]?.message?.content?.trim() || '';

    if (!description) {
      throw new Error('لم يتم توليد وصف صالح');
    }

    console.log('✅ تم توليد الوصف بنجاح');

    return new Response(
      JSON.stringify({
        success: true,
        description,
        extractedText: trimmedText,
        textLength: trimmedText.length,
        processedPages,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 خطأ في extract-text-and-generate-description:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'حدث خطأ غير متوقع',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } finally {
    // حذف الملف المؤقت
    if (tempFilePath && supabase) {
      try {
        await supabase.storage.from(TEMP_BUCKET).remove([tempFilePath]);
        console.log(`🗑️ تم حذف الملف المؤقت: ${tempFilePath}`);
      } catch (cleanupErr) {
        console.error('فشل حذف الملف المؤقت:', cleanupErr);
      }
    }
  }
});
