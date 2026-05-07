import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const today = new Date();
    const dateString = today.toISOString().split('T')[0];
    
    // الحصول على يوم الأسبوع بالعربية
    const daysOfWeek = [
      'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'
    ];
    const dayName = daysOfWeek[today.getDay()];

    // First, check if we already have a message for today
    const { data: existingMessage, error: fetchError } = await supabase
      .from('daily_messages')
      .select('*')
      .eq('date', dateString)
      .single();

    if (existingMessage && !fetchError) {
      // Return existing message for today
      return new Response(
        JSON.stringify({
          message: existingMessage.message,
          date: existingMessage.date,
          dayName: existingMessage.day_name,
          timestamp: existingMessage.created_at
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Generate new message only if none exists for today
    const mistralApiKey = Deno.env.get('MISTRAL_API_KEY');
    
    if (!mistralApiKey) {
      throw new Error('MISTRAL_API_KEY is not configured');
    }

    // إنشاء نص تحفيزي فريد لهذا التاريخ باستخدام التاريخ كـ seed
    const systemPrompt = `أنت كاتب محتوى ملهم ومتخصص في كتابة رسائل تحفيزية قصيرة للقراء العرب. 
    اكتب رسالة تحفيزية قصيرة (50-80 كلمة) عن أهمية القراءة وتأثيرها الإيجابي على الحياة.
    
    متطلبات الرسالة:
    - استخدم اللغة العربية الفصحى البسيطة
    - كن ملهماً ومحفزاً
    - اربط القراءة بالنمو الشخصي والمعرفة
    - اجعل الرسالة مناسبة ليوم ${dayName}
    - لا تستخدم علامات تنسيق مثل ** أو # 
    - اكتب بأسلوب دافئ وودود
    
    التاريخ: ${dateString}`;

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mistralApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: `اكتب رسالة تحفيزية عن القراءة ليوم ${dayName} ${dateString}` 
          }
        ],
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Mistral API error:', error);
      throw new Error('Failed to generate daily message');
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message?.content || 'القراءة هي نافذة على عوالم لا محدودة من المعرفة والخيال.';

    // Save the new message to database
    const { error: insertError } = await supabase
      .from('daily_messages')
      .insert({
        message: message.trim(),
        date: dateString,
        day_name: dayName
      });

    if (insertError) {
      console.error('Error saving daily message:', insertError);
      // Continue and return the message even if save fails
    }

    return new Response(
      JSON.stringify({
        message: message.trim(),
        date: dateString,
        dayName: dayName,
        timestamp: today.toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in daily-messages function:', error);
    
    // في حالة الخطأ، نعطي رسالة افتراضية
    const today = new Date();
    const dateString = today.toISOString().split('T')[0];
    const daysOfWeek = [
      'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'
    ];
    const dayName = daysOfWeek[today.getDay()];
    
    return new Response(
      JSON.stringify({ 
        message: 'القراءة رحلة ممتعة تأخذك إلى عوالم جديدة من المعرفة والإلهام. كل كتاب تقرؤه يضيف إلى شخصيتك بعداً جديداً ويوسع آفاق تفكيرك.',
        date: dateString,
        dayName: dayName,
        timestamp: today.toISOString(),
        isDefault: true
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});