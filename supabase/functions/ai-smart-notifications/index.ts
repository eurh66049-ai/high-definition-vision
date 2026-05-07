import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id مطلوب' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const MISTRAL_API_KEY = Deno.env.get('MISTRAL_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!MISTRAL_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'MISTRAL_API_KEY غير مُهيأ' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // جمع بيانات المستخدم
    const [profileRes, readingRes, favoritesRes, reviewsRes, downloadsRes, recentNotifRes] = await Promise.all([
      supabase.from('profiles').select('username, avatar_url, created_at').eq('id', user_id).single(),
      supabase.from('reading_history').select('book_id, last_page, total_pages, last_read_at, book_title').eq('user_id', user_id).order('last_read_at', { ascending: false }).limit(10),
      supabase.from('book_likes').select('book_id, created_at').eq('user_id', user_id).limit(20),
      supabase.from('book_reviews').select('book_id, rating, created_at').eq('user_id', user_id).limit(10),
      supabase.from('book_downloads').select('book_id, created_at').eq('user_id', user_id).order('created_at', { ascending: false }).limit(10),
      // التأكد من عدم إرسال إشعارات مكررة خلال 24 ساعة
      supabase.from('notifications').select('title, created_at').eq('user_id', user_id).eq('type', 'ai_suggestion').order('created_at', { ascending: false }).limit(5),
    ]);

    // التحقق من آخر إشعار ذكي (لا نرسل أكثر من واحد كل 12 ساعة)
    const recentAiNotifs = recentNotifRes.data || [];
    if (recentAiNotifs.length > 0) {
      const lastNotifTime = new Date(recentAiNotifs[0].created_at).getTime();
      const hoursSinceLast = (Date.now() - lastNotifTime) / (1000 * 60 * 60);
      if (hoursSinceLast < 12) {
        return new Response(
          JSON.stringify({ success: true, skipped: true, message: 'تم إرسال إشعار ذكي مؤخراً' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const profile = profileRes.data;
    const readingHistory = readingRes.data || [];
    const favorites = favoritesRes.data || [];
    const reviews = reviewsRes.data || [];
    const downloads = downloadsRes.data || [];

    // تحليل الكتب غير المكتملة
    const unfinishedBooks = readingHistory.filter(r => {
      if (!r.total_pages || !r.last_page) return false;
      const progress = (r.last_page / r.total_pages) * 100;
      return progress > 10 && progress < 90;
    });

    // تحليل النشاط
    const daysSinceLastRead = readingHistory.length > 0
      ? Math.floor((Date.now() - new Date(readingHistory[0].last_read_at).getTime()) / (1000 * 60 * 60 * 24))
      : -1;

    const userContext = {
      username: profile?.username || 'قارئ',
      accountAge: profile?.created_at ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0,
      hasAvatar: !!profile?.avatar_url,
      totalBooksRead: readingHistory.length,
      unfinishedBooks: unfinishedBooks.map(b => ({
        title: b.book_title || 'كتاب',
        progress: Math.round((b.last_page! / b.total_pages!) * 100),
      })),
      daysSinceLastRead,
      totalFavorites: favorites.length,
      totalReviews: reviews.length,
      totalDownloads: downloads.length,
    };

    console.log('📊 User context for AI:', JSON.stringify(userContext));

    const systemPrompt = `أنت مساعد ذكي لموقع "كتبي" - منصة عربية لقراءة الكتب. مهمتك إنشاء إشعار واحد مفيد وشخصي للمستخدم بناءً على بياناته.

## قواعد صارمة:
- أنشئ إشعاراً واحداً فقط
- كن مختصراً ومفيداً (جملة أو جملتان فقط)
- استخدم أسلوباً ودياً ومحفزاً
- لا تكرر نفس النصيحة
- أضف إيموجي واحد مناسب
- أجب بصيغة JSON فقط بهذا الشكل:
{"title": "عنوان قصير", "message": "رسالة الإشعار"}

## أنواع الإشعارات الممكنة:
1. تذكير بإكمال كتاب غير مكتمل (إذا وجد)
2. تحفيز على القراءة (إذا لم يقرأ منذ فترة)
3. اقتراح إضافة صورة شخصية (إذا لم يضفها)
4. تشجيع على كتابة مراجعة (إذا قرأ كتباً ولم يراجع)
5. تحفيز على اكتشاف كتب جديدة
6. نصيحة قرائية عامة
7. تذكير بميزات الموقع (المفضلة، نوادي القراءة، الاقتباسات)
8. إنجاز شخصي (مثل: قرأت 5 كتب!)

اختر النوع الأنسب بناءً على بيانات المستخدم.`;

    const userPrompt = `بيانات المستخدم:
- الاسم: ${userContext.username}
- عمر الحساب: ${userContext.accountAge} يوم
- لديه صورة شخصية: ${userContext.hasAvatar ? 'نعم' : 'لا'}
- عدد الكتب المقروءة: ${userContext.totalBooksRead}
- أيام منذ آخر قراءة: ${userContext.daysSinceLastRead === -1 ? 'لم يقرأ بعد' : userContext.daysSinceLastRead + ' يوم'}
- كتب غير مكتملة: ${userContext.unfinishedBooks.length > 0 ? userContext.unfinishedBooks.map(b => `${b.title} (${b.progress}%)`).join('، ') : 'لا يوجد'}
- عدد المفضلات: ${userContext.totalFavorites}
- عدد المراجعات: ${userContext.totalReviews}
- عدد التحميلات: ${userContext.totalDownloads}

أنشئ إشعاراً واحداً مناسباً لهذا المستخدم:`;

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MISTRAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Mistral API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'خطأ في الذكاء الاصطناعي' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || '';

    console.log('🤖 AI Response:', aiResponse);

    // استخراج JSON من الرد
    let notification: { title: string; message: string };
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*?\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      notification = JSON.parse(jsonMatch[0]);
    } catch {
      console.error('Failed to parse AI response:', aiResponse);
      notification = {
        title: '📚 نصيحة من كتبي',
        message: 'استكشف كتباً جديدة اليوم! المكتبة مليئة بالكنوز التي تنتظرك.',
      };
    }

    // حفظ الإشعار في قاعدة البيانات
    const { error: insertError } = await supabase
      .from('notifications')
      .insert({
        user_id,
        title: notification.title,
        message: notification.message,
        type: 'ai_suggestion',
        read: false,
      });

    if (insertError) {
      console.error('Error inserting notification:', insertError);
      return new Response(
        JSON.stringify({ error: 'خطأ في حفظ الإشعار' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ AI notification created successfully');

    return new Response(
      JSON.stringify({
        success: true,
        notification,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('AI Smart Notifications error:', error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ في معالجة الطلب' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
