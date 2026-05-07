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
    const { content, language = 'ar' } = await req.json();
    console.log('moderate-content-ai request', { content_length: content?.length || 0, language });

    if (!content) {
      return new Response(
        JSON.stringify({ error: 'المحتوى مطلوب' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const prompt = language === 'ar' 
      ? `قم بتحليل النص التالي للبحث عن أي محتوى مسيء أو غير لائق أو كلمات محظورة:

"${content}"

يجب اعتبار هذه الكلمات مخالفة ومسيئة حتى لو بدت عادية:
- كلب، حمار، غبي، أحمق (شتائم عربية)
- كلمات السب والشتم في أي لهجة عربية
- أي كلمة تُستخدم للإهانة أو التنمر
- الكلمات المبطنة أو التلميحات المسيئة

ابحث عن:
- أي شتيمة أو كلمة مسيئة (حتى لو كانت خفيفة)
- الكلمات المحظورة في الثقافة العربية
- خطاب الكراهية والتهديدات
- المحتوى الجنسي غير اللائق
- التنمر أو المضايقة
- المعلومات الشخصية الحساسة
- الدعوة للأذى

كن صارماً جداً! أي كلمة يمكن أن تُعتبر مسيئة أو محظورة يجب اعتبارها مخالفة.

ملاحظات مهمة:
- اعتبر التحايلات الكتابية مثل العربيزي/Arabizi 
- التقط الشتائم باللهجات العامية
- كن حساساً للثقافة العربية والإسلامية

رد بتنسيق JSON فقط:
{
  "isOffensive": true/false,
  "severity": "low/medium/high/critical", 
  "violations": ["قائمة بالمخالفات المكتشفة"],
  "confidence": 0.95
}`
      : `Analyze the following text for ANY offensive, inappropriate content, or banned words:

"${content}"

Consider these words as violations even if they seem mild:
- Dog, donkey, stupid, fool (Arabic insults)
- Any swear words or insults in any Arabic dialect
- Any word used for bullying or harassment
- Implicit or subtle offensive references

Look for:
- ANY profanity or offensive language (even mild ones)
- Banned words in Arabic culture
- Hate speech and threats
- Inappropriate sexual content
- Bullying or harassment
- Sensitive personal information
- Calls for harm

BE VERY STRICT! Any word that could be considered offensive or banned should be flagged as a violation.

Notes:
- Consider Arabizi/Arabic transliteration
- Detect dialect slang and insults
- Be sensitive to Arabic and Islamic culture

Respond in JSON format only:
{
  "isOffensive": true/false,
  "severity": "low/medium/high/critical",
  "violations": ["list of detected violations"],
  "confidence": 0.95
}`;

    console.log('🔑 Sending request to Mistral with API key present:', !!mistralApiKey);
    
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
            content: 'أنت خبير في تحليل المحتوى وكشف المحتوى المسيء. قم بالتحليل بدقة وأعطِ ردود دقيقة بتنسيق JSON فقط.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.1,
      }),
    });

    console.log('📡 Mistral API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Mistral API error:', response.status, errorText);
      throw new Error(`Mistral API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Mistral raw response:', JSON.stringify(data, null, 2));
    
    const aiResponse = data.choices[0].message.content.trim();
    console.log('🔍 AI response content:', aiResponse);

    // Parse AI response
    let moderationResult;
    try {
      moderationResult = JSON.parse(aiResponse);
    } catch (parseError) {
      // Fallback if AI doesn't return valid JSON
      moderationResult = {
        isOffensive: false,
        severity: 'low',
        violations: [],
        confidence: 0.5
      };
    }

    // Additional deterministic Moroccan Darija check (including Arabizi)
    const text = (content || '').toLowerCase();

    const darijaPatterns: Array<{ re: RegExp; label: string; severity: 'medium' | 'high' | 'critical' }> = [
      { re: /\b(zbi|zebi|zob|zobbi|زب|زبي)\b/gi, label: 'شتيمة دارجة (zbi/زب)', severity: 'high' },
      { re: /\b(khra|khara|خر[ا]+|زبل)\b/gi, label: 'ألفاظ بذيئة (خرا/khra)', severity: 'high' },
      { re: /\b(zml|zamel|زامل)\b/gi, label: 'شتيمة دارجة (zml)', severity: 'high' },
      { re: /\b(9hba|9ahba|qa?hba|قحبة|قحب)\b/gi, label: 'إهانة جنسية (قحبة)', severity: 'critical' },
      { re: /\b(bghal|حمار|حمير|bhmar|hm[aā]r|7mar|7m[aā]r)\b/gi, label: 'إهانة (حمار)', severity: 'medium' },
      { re: /\b(n3al|n3la|la3nat|نعل|نعلت|لعنة|لعنت)\b/gi, label: 'دعاء بالإهانة (نعل/لعنة)', severity: 'medium' },
      { re: /\b(klb|kelb|kleb|kalb|كلب|كلاب)\b/gi, label: 'إهانة (كلب)', severity: 'medium' },
      { re: /\b(9wd|9awed|qa?wad|قواد)\b/gi, label: 'إهانة جسيمة (قواد)', severity: 'critical' },
      { re: /\b(تقود|كتقود|تتقود|كتقواد|تقواد)\b/gi, label: 'إهانة دارجة (تقود)', severity: 'critical' },
      { re: /\b(t9wd|t9wad|tqwd|tqwad|kat9wd|kat9wad|katqwd|katqwad)\b/gi, label: 'إهانة دارجة (t9wd/tqwd)', severity: 'critical' },
      { re: /\b(7aywan|haywan|حيوان)\b/gi, label: 'إهانة (حيوان)', severity: 'medium' },
      { re: /(سب|سبني|تساب|تشتم|شتم|شتمت|tsabt|tsebt)/gi, label: 'سب/شتم', severity: 'medium' },
      { re: /\b(3rs|3ers|3rss|عرس) ?(umk|omk|omk|امك|أمك)\b/gi, label: 'إهانة للأم', severity: 'critical' }
    ];

    const foundViolations: string[] = [];
    let localMax: 'low' | 'medium' | 'high' | 'critical' | null = null;
    const sevRank: Record<'low' | 'medium' | 'high' | 'critical', number> = { low: 1, medium: 2, high: 3, critical: 4 };

    for (const p of darijaPatterns) {
      if (p.re.test(text)) {
        foundViolations.push(p.label);
        if (!localMax || sevRank[p.severity] > sevRank[localMax]) {
          localMax = p.severity;
        }
      }
    }

    // Merge AI result with deterministic patterns
    let finalIsOffensive = !!moderationResult?.isOffensive || foundViolations.length > 0;
    let finalSeverity: 'low' | 'medium' | 'high' | 'critical' =
      (moderationResult?.severity as any) || 'low';
    if (localMax && sevRank[localMax] > sevRank[finalSeverity]) {
      finalSeverity = localMax;
    }

    const finalViolations = Array.from(
      new Set([...(moderationResult?.violations || []), ...foundViolations])
    );

    const finalResult = {
      isOffensive: finalIsOffensive,
      severity: finalSeverity,
      violations: finalViolations,
      confidence: moderationResult?.confidence ?? 0.85,
      dialect: foundViolations.length > 0 ? 'darija_detected' : 'unknown'
    };

    return new Response(
      JSON.stringify(finalResult),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in moderate-content-ai function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'حدث خطأ في تحليل المحتوى',
        isOffensive: false,
        severity: 'low',
        violations: [],
        confidence: 0
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});