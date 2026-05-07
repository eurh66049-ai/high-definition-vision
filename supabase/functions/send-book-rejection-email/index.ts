import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// إعدادات EmailJS
const EMAILJS_SERVICE_ID = 'service_unx695l';
const EMAILJS_TEMPLATE_ID = 'template_wji3iem';
const EMAILJS_PUBLIC_KEY = 'S2pFw_vwPoaDn7pFH';
const EMAILJS_PRIVATE_KEY = Deno.env.get('EMAILJS_PRIVATE_KEY') || '';

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { 
      bookId, 
      userId, 
      bookTitle, 
      bookAuthor, 
      bookCategory, 
      userEmail, 
      rejectionReason 
    } = await req.json()

    console.log('طلب إرسال بريد إلكتروني لرفض الكتاب:', {
      bookId,
      userId,
      bookTitle,
      bookAuthor,
      userEmail
    })

    if (!userEmail || !bookTitle || !rejectionReason) {
      return new Response(
        JSON.stringify({ error: 'بيانات مطلوبة ناقصة' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // الحصول على اسم المستخدم
    let userName = 'الكاتب المحترم';
    if (userId) {
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('username, email')
        .eq('id', userId)
        .single()
      
      if (profile) {
        userName = profile.username || profile.email || 'الكاتب المحترم';
      }
    }

    // ترجمة التصنيف إلى العربية
    const getCategoryLabel = (categoryKey: string): string => {
      const categories: Record<string, string> = {
        'novels': 'روايات',
        'philosophy-culture': 'الفكر والثقافة العامة',
        'islamic-sciences': 'العلوم الإسلامية',
        'story-collections': 'مجموعة قصص',
        'poetry': 'الشعر',
        'texts-essays': 'نصوص وخواطر',
        'literature': 'الأدب',
        'history-civilizations': 'التاريخ والحضارات',
        'human-development': 'التنمية البشرية وتطوير الذات',
        'memoirs-autobiographies': 'مذكرات وسير ذاتية',
        'philosophy-logic': 'الفلسفة والمنطق',
        'politics': 'السياسية',
        'children': 'الأطفال',
        'studies-research': 'دراسات وبحوث',
        'religion': 'الأديان',
        'plays-arts': 'مسرحيات وفنون',
        'psychology': 'علم النفس',
        'education-pedagogy': 'التعليم والتربية',
        'love-relationships': 'الحب والعلاقات',
      };
      return categories[categoryKey] || categoryKey;
    };

    // تنسيق التاريخ
    const formatRejectionDate = (date: Date = new Date()): string => {
      return date.toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    console.log('بدء استدعاء EmailJS...')

    // إعداد معاملات البريد الإلكتروني
    const templateParams = {
      user_name: userName,
      to_email: userEmail,
      book_title: bookTitle,
      book_author: bookAuthor,
      book_category: getCategoryLabel(bookCategory),
      rejection_reason: rejectionReason,
      rejection_date: formatRejectionDate()
    };

    console.log('معاملات البريد الإلكتروني:', templateParams);

    try {
      console.log('المحاولة الأولى: إرسال باستخدام EmailJS API...')
      
      const emailResponse = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service_id: EMAILJS_SERVICE_ID,
          template_id: EMAILJS_TEMPLATE_ID,
          user_id: EMAILJS_PUBLIC_KEY,
          accessToken: EMAILJS_PRIVATE_KEY,
          template_params: templateParams
        })
      });

      console.log('استجابة EmailJS:', { status: emailResponse.status, statusText: emailResponse.statusText });

      if (emailResponse.ok) {
        console.log('تم إرسال البريد بنجاح عبر EmailJS:', emailResponse.statusText);
        console.log('تم إرسال بريد رفض الكتاب بنجاح إلى:', userEmail);

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else {
        const errorText = await emailResponse.text();
        throw new Error(`خطأ من EmailJS: ${emailResponse.status} - ${errorText}`);
      }

    } catch (emailError) {
      console.error('خطأ في إرسال البريد عبر EmailJS:', emailError);
      throw emailError;
    }

  } catch (error) {
    console.error('خطأ في إرسال بريد رفض الكتاب:', error)
    return new Response(
      JSON.stringify({ 
        error: 'فشل في إرسال البريد الإلكتروني',
        details: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})