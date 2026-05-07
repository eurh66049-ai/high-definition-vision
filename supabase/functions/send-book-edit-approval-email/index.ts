import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BookEditApprovalEmailRequest {
  bookId: string;
  userId: string;
  bookTitle: string;
  bookAuthor: string;
  bookCategory: string;
  userEmail: string;
  editRequests: string;
  editorNotes?: string;
  coverImageUrl?: string;
}

interface EmailJsConfig {
  serviceId: string;
  templateId: string;
  publicKey: string;
  privateKey: string;
}

const getEmailJsConfig = (): EmailJsConfig => {
  return {
    serviceId: Deno.env.get('EMAILJS_EDIT_SERVICE_ID') ?? '',
    templateId: Deno.env.get('EMAILJS_EDIT_TEMPLATE_ID') ?? '',
    publicKey: Deno.env.get('EMAILJS_EDIT_PUBLIC_KEY') ?? '',
    privateKey: Deno.env.get('EMAILJS_EDIT_PRIVATE_KEY') ?? '',
  };
};

// ملف مبسط - سيستخدم HTML من EmailJS مباشرة

/**
 * ترجمة التصنيف إلى العربية
 */
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
    'politics': 'السياسة',
    'children': 'الأطفال',
    'studies-research': 'دراسات وبحوث',
    'religion': 'الأديان',
    'plays-arts': 'مسرحيات وفنون',
    'psychology': 'علم النفس',
    'education-pedagogy': 'التعليم والتربية',
    'love-relationships': 'الحب والعلاقات',
    'interpretations': 'التفاسير',
    'prophetic-biography': 'السيرة النبوية',
    'successors-followers': 'سيرة الخلفاء والتابعين',
    'marketing-business': 'التسويق وإدارة الأعمال',
    'sciences': 'العلوم',
    'arabic-learning': 'تعلم اللغة العربية',
    'womens-culture': 'ثقافة المرأة',
    'translation-dictionaries': 'الترجمة ومعاجم',
    'prophets-stories': 'قصص الأنبياء',
    'economics': 'الإقتصاد',
    'sociology': 'علم الإجتماع',
    'sufism': 'الصوفية',
    'english-learning': 'تعلم اللغة الإنجليزية',
    'medicine-nursing': 'الطب والتمريض',
    'communication-media': 'التواصل والإعلام',
    'nutrition': 'التغذية',
    'law': 'القانون',
    'programming': 'البرمجة',
    'alternative-medicine': 'الأعشاب والطب البديل',
    'mathematics': 'الرياضة',
    'computer-science': 'علوم الحاسوب',
    'french-learning': 'تعلم اللغة الفرنسية',
    'military-sciences': 'الحرب والعلوم العسكرية',
    'spanish-learning': 'تعلم اللغة الإسبانية',
    'photography': 'التصوير الفوتوغرافي',
    'cooking': 'الطبخ',
    'magazines': 'مجلات',
    'dream-interpretation': 'تفاسير الأحلام',
    'encyclopedias': 'المصاحف',
    'german-learning': 'تعلم اللغة الألمانية'
  };
  
  return categories[categoryKey] || categoryKey;
};

/**
 * إرسال بريد إلكتروني باستخدام EmailJS مع محاولة متعددة
 */
const sendEmailViaEmailJS = async (config: EmailJsConfig, templateParams: Record<string, any>): Promise<{ success: boolean; error?: string }> => {
  let lastError = '';
  
  // محاولة أولى مع EmailJS API المعياري
  try {
    console.log('إرسال بريد موافقة التعديلات باستخدام EmailJS API...');
    
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Supabase-Edge-Function/1.0',
        'Origin': 'https://kotobi.xyz',
        'Referer': 'https://kotobi.xyz',
      },
      body: JSON.stringify({
        service_id: config.serviceId,
        template_id: config.templateId,
        user_id: config.publicKey,
        accessToken: config.privateKey,
        template_params: templateParams,
      }),
    });

    console.log('استجابة EmailJS للتعديلات:', {
      status: response.status,
      statusText: response.statusText
    });

    if (response.ok) {
      const responseText = await response.text();
      console.log('تم إرسال بريد موافقة التعديلات بنجاح:', responseText);
      return { success: true };
    } else {
      const errorText = await response.text();
      lastError = `EmailJS Error: ${response.status} - ${errorText}`;
      console.error('فشل EmailJS للتعديلات:', lastError);
    }
  } catch (error) {
    lastError = `EmailJS Exception: ${error.message}`;
    console.error('خطأ في EmailJS للتعديلات:', error);
  }

  // محاولة ثانية مع معاملات مختلفة
  try {
    console.log('المحاولة الثانية: إرسال مع معاملات محدثة للتعديلات...');
    
    const alternativeParams = {
      ...templateParams,
      from_name: 'منصة كتبي - التعديلات',
      reply_to: 'noreply@kotobi.com',
    };

    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        service_id: config.serviceId,
        template_id: config.templateId,
        user_id: config.publicKey,
        accessToken: config.privateKey,
        template_params: alternativeParams,
      }),
    });

    if (response.ok) {
      console.log('تم إرسال بريد موافقة التعديلات بنجاح في المحاولة الثانية');
      return { success: true };
    } else {
      const errorText = await response.text();
      lastError = `Second attempt failed: ${response.status} - ${errorText}`;
      console.error('فشلت المحاولة الثانية للتعديلات:', lastError);
    }
  } catch (error) {
    lastError = `Second attempt exception: ${error.message}`;
    console.error('خطأ في المحاولة الثانية للتعديلات:', error);
  }

  return { success: false, error: lastError };
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const emailJsConfig = getEmailJsConfig();

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      bookId, 
      userId, 
      bookTitle, 
      bookAuthor, 
      bookCategory, 
      userEmail,
      editRequests,
      editorNotes,
      coverImageUrl
    }: BookEditApprovalEmailRequest = await req.json();

    console.log('طلب إرسال بريد إلكتروني لموافقة تعديلات الكتاب:', {
      bookId,
      userId,
      bookTitle,
      bookAuthor,
      userEmail,
      editRequests: editRequests?.substring(0, 100) + '...'
    });

    // جلب معلومات المستخدم
    const { data: userProfile, error: userError } = await supabaseClient
      .from('profiles')
      .select('username, email')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('خطأ في جلب بيانات المستخدم:', userError);
    }

    // جلب معلومات الكتاب المعتمد لإنشاء الرابط
    const { data: bookSubmission, error: bookError } = await supabaseClient
      .from('book_submissions')
      .select('slug, id, cover_image_url')
      .eq('id', bookId)
      .single();

    const bookCoverUrl = coverImageUrl || bookSubmission?.cover_image_url || '';

    let bookUrl = 'https://kotobi.xyz';
    
    if (!bookError && bookSubmission) {
      if (bookSubmission.slug) {
        bookUrl = `https://kotobi.xyz/book/${bookSubmission.slug}`;
      } else {
        bookUrl = `https://kotobi.xyz/book/${bookSubmission.id}`;
      }
    }

    // إعداد معاملات البريد الإلكتروني
    const userName = userProfile?.username || userProfile?.email || 'عزيزي المؤلف';
    const targetEmail = userEmail || userProfile?.email;
    
    if (!targetEmail) {
      throw new Error('لا يوجد بريد إلكتروني للمستخدم');
    }

    const templateParams = {
      user_name: userName,
      to_email: targetEmail,
      book_title: bookTitle,
      book_author: bookAuthor,
      book_category: getCategoryLabel(bookCategory),
      book_url: bookUrl,
      cover_image_url: bookCoverUrl,
      edit_requests: editRequests || 'تعديلات عامة على الكتاب',
      editor_notes: editorNotes || '',
      approval_date: new Date().toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
    };

    console.log('معاملات البريد الإلكتروني للتعديلات:', templateParams);

    // إرسال البريد الإلكتروني
    console.log('بدء استدعاء EmailJS لموافقة التعديلات...');
    const emailResult = await sendEmailViaEmailJS(emailJsConfig, templateParams);
    console.log('نتيجة إرسال بريد التعديلات:', emailResult);

    if (emailResult.success) {
      console.log('تم إرسال بريد موافقة التعديلات بنجاح إلى:', targetEmail);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'تم إرسال بريد موافقة التعديلات بنجاح',
          email: targetEmail
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    } else {
      // في حالة فشل EmailJS، نقوم بتسجيل التفاصيل وإرجاع نجاح جزئي
      console.error('فشل في إرسال بريد التعديلات:', emailResult.error);
      
      // إرسال إشعار داخلي بدلاً من البريد الإلكتروني
      await supabaseClient
        .from('notifications')
        .insert({
          user_id: userId,
          title: 'تمت الموافقة على تعديلاتك! ✅',
          message: `تم قبول التعديلات المطلوبة لكتاب "${bookTitle}" وأصبحت مطبقة الآن.`,
          type: 'success',
          created_at: new Date().toISOString()
        });

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'تمت الموافقة على التعديلات وتم إرسال إشعار داخلي. لم يتم إرسال البريد الإلكتروني بسبب مشكلة تقنية.',
          email: targetEmail,
          emailError: emailResult.error
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

  } catch (error) {
    console.error('خطأ في edge function للتعديلات:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'خطأ غير معروف',
        success: false 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }, 
        status: 500 
      }
    );
  }
});