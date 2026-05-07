import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      message,
      bookTitle,
      bookAuthor,
      bookId,
      bookFileUrl,
      pdfTextContent,
      pdfTotalPages,
      conversationHistory = [],
      contextMode = 'book',
      requestedPages = [],
      currentPage,
    } = (body ?? {}) as any;

    const history = Array.isArray(conversationHistory) ? conversationHistory : [];

    const MISTRAL_API_KEY = Deno.env.get('MISTRAL_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!MISTRAL_API_KEY) {
      console.error('MISTRAL_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'مفتاح API غير مُهيأ' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // إذا لم يكن هناك محتوى PDF، نستخدم النص المخزن في قاعدة البيانات
    let finalPdfContent = pdfTextContent || '';
    
    if (!finalPdfContent && bookId) {
      console.log('🔄 البحث عن النص المخزن في قاعدة البيانات...');
      
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // جلب النص المخزن من جدول book_extracted_text
        const { data: storedText, error: storedError } = await supabase
          .from('book_extracted_text')
          .select('extracted_text, text_length, extraction_status')
          .eq('book_id', bookId)
          .single();
        
        if (storedError) {
          console.log('⚠️ لم يتم العثور على نص مخزن:', storedError.message);
        } else if (storedText?.extraction_status === 'completed' && storedText?.extracted_text) {
          finalPdfContent = storedText.extracted_text;
          console.log(`✅ تم جلب ${storedText.text_length} حرف من النص المخزن`);
        } else {
          console.log('⚠️ النص غير مكتمل أو غير متاح:', storedText?.extraction_status);
        }
        
        // إذا لم يوجد نص مخزن، نحاول استخراجه مباشرة
        if (!finalPdfContent && bookFileUrl) {
          console.log('🔄 استدعاء extract-pdf-text كخطة بديلة...');
          
          const { data: extractResult, error: extractError } = await supabase.functions.invoke('extract-pdf-text', {
            body: { 
              bookId: bookId || null,
              bookFileUrl: bookFileUrl || null
            }
          });
          
          if (extractError) {
            console.error('⚠️ خطأ في extract-pdf-text:', extractError);
          } else if (extractResult?.success && extractResult?.text) {
            finalPdfContent = extractResult.text;
            console.log(`✅ تم استخراج ${finalPdfContent.length} حرف من extract-pdf-text`);
          }
        }
      } catch (extractError) {
        console.error('⚠️ خطأ في جلب/استخراج النص:', extractError);
      }
    }

    console.log('📚 Book Reader Assistant Request:', {
      bookTitle,
      bookAuthor,
      pdfTotalPages,
      messageLength: message?.length,
      pdfContentLength: finalPdfContent?.length,
      historyLength: history.length,
      contextMode,
      requestedPages,
      currentPage,
    });
    const sanitizeContext = (s: string) =>
      (s ?? '')
        .replace(/\r/g, '')
        .replace(/[\u0000-\u001f]/g, ' ')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n[ \t]+/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    const looksLikeSpam = (txt: string) => {
      const t = (txt ?? '').trim();
      if (!t) return true;
      if (/(?:ه\s*ه\s*ه){4,}/.test(t)) return true; // ههههه...
      if (/(?:ها){10,}/.test(t)) return true; // هاهاها...

      const words = t.split(/\s+/).filter(Boolean);
      if (words.length >= 25) {
        const uniq = new Set(words.map((w) => w.toLowerCase())).size;
        if (uniq / words.length < 0.25) return true; // تكرار عالي جداً
      }
      return false;
    };

    const postProcessAnswer = (txt: string) => {
      let t = (txt ?? '').trim();

      // إزالة أي علامات صفحات إذا قام النموذج بإرجاعها
      t = t
        .replace(/--- صفحة \d+ ---/g, '')
        .replace(/مقتطفات.*?:/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      // في الأوضاع غير المقيّدة بالصفحات: لا نذكر أرقام الصفحات إلا إذا سأل المستخدم عنها
      const userAskedAboutPages = /(?:الصفحة|صفحة|ص\.?\s*\d+)/.test(message || '');
      if (!userAskedAboutPages && (contextMode === 'book' || contextMode === 'current')) {
        t = t.replace(/(?:الصفحة|صفحة)\s*\d+/g, '').replace(/\s{2,}/g, ' ').trim();
      }

      return t;
    };

    // Use a large context window with the strongest Mistral model
    const maxContentLength = 60000;
    const truncatedContent = sanitizeContext((finalPdfContent ?? '').substring(0, maxContentLength));

    // تحقق من وجود محتوى حقيقي (وليس فقط عناوين الصفحات)
    const realContent = truncatedContent
      .replace(/مقتطفات.*?:\n/g, '')
      .replace(/--- صفحة \d+ ---\n/g, '')
      .trim();

    const hasRealContent = realContent.length > 30;

    console.log('📄 Content analysis:', {
      truncatedLength: truncatedContent.length,
      realContentLength: realContent.length,
      hasRealContent,
    });

    const modeDirectives = (() => {
      const pagesStr = Array.isArray(requestedPages) && requestedPages.length
        ? requestedPages.join(', ')
        : 'غير محدد';
      const currentStr = typeof currentPage === 'number' ? String(currentPage) : 'غير محدد';

      if (contextMode === 'page_strict') {
        return `\n## تعليمات صارمة (صفحة فقط)\n- المستخدم طلب صفحات محددة فقط: ${pagesStr}.\n- استخدم فقط النص الموجود لتلك الصفحات داخل (--- صفحة X ---).\n- ممنوع ذكر أو تلخيص أو الاستنتاج من أي صفحات أخرى.\n- لا تُرجع علامات الصفحات أو مقتطفات طويلة؛ أجب بصياغتك إلا إذا طُلب اقتباس حرفي.`;
      }

      if (contextMode === 'page') {
        return `\n## تعليمات (صفحات محددة)\n- المستخدم طلب صفحات: ${pagesStr}.\n- أجب فقط اعتماداً على هذه الصفحات ولا تذكر صفحات أخرى إلا إذا سُئلت عنها.\n- لا تُرجع علامات الصفحات أو مقتطفات طويلة؛ أجب بصياغتك.`;
      }

      if (contextMode === 'current') {
        return `\n## تعليمات (الصفحة الحالية)\n- اعتبر أن السؤال مرتبط بالصفحة الحالية: ${currentStr}.\n- لا تذكر صفحات أخرى أو تقفز لما بعدها إلا إذا طلب المستخدم ذلك.\n- لا تُرجع علامات الصفحات أو مقتطفات طويلة؛ أجب بصياغتك.`;
      }

      return `\n## تعليمات عامة للإخراج\n- لا تذكر أرقام الصفحات إلا إذا سأل المستخدم عن صفحة.\n- لا تُرجع علامات الصفحات (--- صفحة ---) في إجابتك.\n- لا تنسخ النص الخام؛ لخّص واشرح.`;
    })();

    // بناء رسائل المحادثة
    const systemPrompt = hasRealContent
      ? `أنت مساعد قراءة فائق الذكاء، خبير في تحليل الكتب وفهم جميع أنواع الأسئلة بالعربية.

## معلومات الكتاب:
- العنوان: ${bookTitle}
- المؤلف: ${bookAuthor}
- عدد الصفحات: ${typeof pdfTotalPages === 'number' ? `${pdfTotalPages} صفحة` : 'غير معروف'}

## محتوى الكتاب المتاح:
${truncatedContent}

## قواعد أساسية:
- افهم نية السائل وليس فقط الكلمات الحرفية
- ممنوع الحشو أو التكرار أو الضحك (مثل: هههه)
- لا تنسخ النص الخام ولا تُرجع مقتطفات طويلة؛ لخّص واشرح بصياغتك
- إذا لم تجد الإجابة داخل المحتوى المتاح:
  - إن كان السؤال عاماً وغير مرتبط مباشرة بالنص: أجب إجابة عامة قصيرة واذكر أنها إجابة عامة وليست مقتبسة من الكتاب.
  - إن كان السؤال يطلب معلومة من الكتاب تحديداً: قل "لا أجد ذلك في النص المتاح" بشكل واضح.
- اجعل إجابتك ضمن سياق هذا الكتاب عندما يكون السؤال عن الأحداث/الشخصيات/الأفكار
- أجب بالعربية الفصحى البسيطة وبشكل مباشر
- اجعل الإجابة مختصرة (3-8 جمل) إلا إذا طلب المستخدم التفصيل
${modeDirectives}`
      : `أنت مساعد قراءة ذكي.

لم نتمكن من استخراج نص قابل للتحليل من هذا الكتاب (قد يكون PDF صوري أو النص غير قابل للاستخراج حالياً).

معلومات الكتاب:
- العنوان: ${bookTitle}
- المؤلف: ${bookAuthor}
- عدد الصفحات: ${typeof pdfTotalPages === 'number' ? `${pdfTotalPages} صفحة` : 'غير معروف'}

قواعد:
- لا تخمّن محتوى صفحات بعينها
- أجب على الأسئلة العامة بإجابة عامة قصيرة
- إذا كان السؤال عن جزء محدد من الكتاب: اطلب من المستخدم تحديد الصفحة
${modeDirectives}`;

    const historyToSend = contextMode === 'page_strict' ? [] : history;

    const buildMessages = (systemContent: string) => [
      { role: 'system', content: systemContent },
      ...historyToSend.map((msg: any) => ({
        role: msg.isBot ? 'assistant' : 'user',
        content: msg.text,
      })),
      { role: 'user', content: message },
    ];

    const callMistral = async (systemContent: string, temperature: number) => {
      const messages = buildMessages(systemContent);

      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MISTRAL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'mistral-large-latest',
          messages,
          max_tokens: 2000,
          temperature,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Mistral API error:', response.status, errorText);
        return null;
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content as string | undefined;
    };

    console.log('🚀 Sending request to Mistral API...');

    let assistantMessage = await callMistral(systemPrompt, 0.2);

    // إعادة محاولة واحدة عند ظهور حشو/تكرار غير منطقي
    if (assistantMessage && looksLikeSpam(assistantMessage)) {
      console.log('♻️ Retrying due to spammy output...');
      assistantMessage = await callMistral(
        `${systemPrompt}\n\n## تنبيه صارم\n- أجب إجابة مفيدة مباشرة بدون تكرار أو حشو أو ضحك.`,
        0.1
      ) ?? assistantMessage;
    }

    assistantMessage = postProcessAnswer(assistantMessage || 'عذراً، لم أتمكن من معالجة طلبك.');

    console.log('✅ Assistant response generated successfully');

    return new Response(
      JSON.stringify({
        response: assistantMessage,
        success: true,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Book Reader Assistant error:', error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ في معالجة طلبك' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
