import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const mistralApiKey = Deno.env.get('MISTRAL_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      bookTitle, 
      bookAuthor, 
      bookCategory, 
      bookLanguage, 
      targetAudience, 
      bookTheme, 
      keyWords, 
      descriptionStyle, 
      bookLength, 
      mainIdea 
    } = await req.json();

    if (!bookTitle) {
      return new Response(
        JSON.stringify({ error: 'عنوان الكتاب مطلوب' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // بناء prompt محسن مع المعلومات التفصيلية
    let prompt = `أكتب وصفاً ${descriptionStyle || 'جذاباً ومشوقاً'} لكتاب بالعربية بناءً على المعلومات التالية:

المعلومات الأساسية:
- العنوان: "${bookTitle}"
${bookAuthor ? `- المؤلف: "${bookAuthor}"` : ''}
${bookCategory ? `- التصنيف: "${bookCategory}"` : ''}
${bookLanguage ? `- اللغة: "${bookLanguage}"` : ''}
${targetAudience ? `- الجمهور المستهدف: "${targetAudience}"` : ''}
${bookLength ? `- حجم الكتاب: "${bookLength}"` : ''}

محتوى الكتاب:
${mainIdea ? `- الفكرة الرئيسية: "${mainIdea}"` : ''}
${bookTheme ? `- موضوع الكتاب: "${bookTheme}"` : ''}
${keyWords ? `- الكلمات المفتاحية: "${keyWords}"` : ''}

متطلبات الوصف:
- أسلوب الكتابة: ${descriptionStyle || 'جذاب ومشوق'}
- طوله مناسب (100-200 كلمة)
- يبرز أهمية وقيمة الكتاب
- يثير فضول القارئ دون كشف تفاصيل كثيرة
- مناسب لمكتبة إلكترونية
- باللغة العربية الفصحى
${targetAudience ? `- موجه للجمهور: ${targetAudience}` : ''}

اكتب فقط الوصف بدون أي إضافات أخرى.`;

    console.log('Generating description for book:', bookTitle);

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mistralApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages: [
          {
            role: 'system',
            content: 'أنت كاتب محترف متخصص في كتابة أوصاف الكتب العربية. اكتب أوصافاً جذابة ومشوقة تجعل القارئ يرغب في قراءة الكتاب.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`Mistral API error: ${response.status}`);
    }

    const data = await response.json();
    const description = data.choices[0].message.content.trim();

    console.log('Generated description successfully');

    return new Response(
      JSON.stringify({ description }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in generate-book-description function:', error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ في توليد الوصف، يرجى المحاولة مرة أخرى' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});