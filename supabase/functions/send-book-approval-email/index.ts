import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BookApprovalEmailRequest {
  bookId: string;
  userId: string;
  bookTitle: string;
  bookAuthor: string;
  bookCategory: string;
  userEmail: string;
  coverImageUrl?: string;
}

interface EmailJsConfig {
  serviceId: string;
  templateId: string;
  publicKey: string;
  privateKey: string;
}

const getEmailJsConfig = (): EmailJsConfig => {
  const config: EmailJsConfig = {
    serviceId: Deno.env.get('EMAILJS_SERVICE_ID') ?? '',
    templateId: Deno.env.get('EMAILJS_TEMPLATE_ID') ?? '',
    publicKey: Deno.env.get('EMAILJS_PUBLIC_KEY') ?? '',
    privateKey: Deno.env.get('EMAILJS_PRIVATE_KEY') ?? '',
  };

  console.log('EmailJS Config:', {
    serviceId: config.serviceId ? 'SET' : 'MISSING',
    templateId: config.templateId ? 'SET' : 'MISSING',
    publicKey: config.publicKey ? 'SET' : 'MISSING',
    privateKey: config.privateKey ? 'SET' : 'MISSING',
  });

  const missingFields = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingFields.length > 0) {
    throw new Error(`إعدادات EmailJS ناقصة: ${missingFields.join(', ')}`);
  }

  return config;
};

// إعدادات احتياطية للأمان
const EMAIL_FROM = 'noreply@kotobi.com';
const EMAIL_SUBJECT_PREFIX = '[كتبي] ';

// نموذج HTML للبريد الإلكتروني
const createEmailTemplate = (userName: string, bookTitle: string, bookAuthor: string, bookCategory: string, bookUrl: string, approvalDate: string, coverImageUrl?: string): string => {
  const coverSection = coverImageUrl ? `
            <div style="text-align: center; margin: 20px 0;">
              <img src="${coverImageUrl}" alt="غلاف كتاب ${bookTitle}" style="max-width: 200px; max-height: 280px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.15); object-fit: cover;" />
            </div>` : '';

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تمت الموافقة على كتابك</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap');
        body { font-family: 'Tajawal', Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; line-height: 1.6; }
        .container { max-width: 600px; margin: 20px auto; background-color: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); overflow: hidden; }
        .header { background-color: #ffffff; padding: 30px; text-align: center; }
        .content { padding: 35px; }
        .logo-table { margin: 0 auto; border-collapse: collapse; }
        .logo-img { width: auto; height: 80px; display: block; }
        .book-details { background-color: #f8f9fa; padding: 25px; border-radius: 10px; margin: 25px 0; border-right: 4px solid #7465ff; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
        .book-details h3 { margin-top: 0; color: #7465ff; font-size: 20px; margin-bottom: 15px; }
        .book-details p { margin: 12px 0; color: #4a5568; font-size: 15px; }
        .book-details strong { color: #2d3748; font-weight: 600; }
        .cta-button { background: linear-gradient(135deg, #7465ff 0%, #5a4af4 100%); color: white; padding: 18px 35px; text-decoration: none; border-radius: 10px; display: inline-block; font-weight: bold; margin: 25px 0; box-shadow: 0 4px 15px rgba(116, 101, 255, 0.3); text-align: center; }
        .features-list { background: #f8f9fa; padding: 25px; border-radius: 10px; margin: 25px 0; }
        .features-list h3 { color: #2d3748; margin-top: 0; margin-bottom: 20px; }
        .features-list ul { list-style: none; padding: 0; margin: 0; }
        .features-list li { padding: 8px 0; color: #4a5568; display: flex; align-items: center; }
        .celebration-banner { background: linear-gradient(45deg, #7465ff, #5a4af4); color: white; padding: 15px; text-align: center; font-weight: bold; margin-bottom: 20px; border-radius: 8px; }
        .footer { background-color: #f8f9fa; padding: 25px; text-align: center; color: #718096; font-size: 14px; border-top: 1px solid #e2e8f0; }
        .footer a { color: #7465ff; text-decoration: none; font-weight: 500; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <table class="logo-table" align="center">
                <tr>
                    <td>
                        <img src="https://f.top4top.io/p_3503iecyv0.png" class="logo-img" alt="شعار المنصة">
                    </td>
                </tr>
            </table>
        </div>
        <div class="content">
            <div class="celebration-banner">
                🎉 تهانينا! تمت الموافقة على كتابك
            </div>
            ${coverSection}
            <h2>عزيزي ${userName}</h2>
            <p>يسعدنا أن نُعلمك بأنه تمت الموافقة على كتابك وأصبح متاحاً الآن في مكتبة "كتبي" الرقمية!</p>
            <div class="book-details">
                <h3>تفاصيل الكتاب المعتمد:</h3>
                <p><strong>العنوان:</strong> ${bookTitle}</p>
                <p><strong>المؤلف:</strong> ${bookAuthor}</p>
                <p><strong>التصنيف:</strong> ${bookCategory}</p>
                <p><strong>تاريخ الموافقة:</strong> ${approvalDate}</p>
            </div>
            <p>كتابك أصبح الآن جزءاً من مكتبتنا الرقمية ويمكن للقراء الوصول إليه والاستمتاع بقراءته.</p>
            <div style="text-align: center;">
                <a href="${bookUrl}" class="cta-button">📖 اعرض كتابك الآن</a>
            </div>
            <div class="features-list">
                <h3>ماذا يحدث الآن؟</h3>
                <ul>
                    <li>✅ كتابك متاح للقراءة على منصة كتبي</li>
                    <li>📊 يمكنك متابعة إحصائيات القراءة والتقييمات</li>
                    <li>📧 ستصلك إشعارات عند وجود تقييمات أو تعليقات جديدة</li>
                    <li>🔄 يمكنك تحديث معلومات الكتاب في أي وقت</li>
                </ul>
            </div>
        </div>
        <div class="footer">
            <p>شكراً لك على إثراء مكتبتنا الرقمية العربية</p>
            <p><strong>فريق منصة كتبي</strong> | <a href="https://kotobi.xyz">kotobi.xyz</a></p>
            <p style="margin-top: 15px; font-size: 12px; color: #94a3b8;">معاً نبني أكبر مكتبة رقمية عربية مجانية</p>
        </div>
    </div>
</body>
</html>
  `;
};

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
    'politics': 'السياسية',
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
    console.log('المحاولة الأولى: إرسال باستخدام EmailJS API...');
    
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        service_id: config.serviceId,
        template_id: config.templateId,
        user_id: config.publicKey,
        accessToken: config.privateKey,
        template_params: templateParams,
      }),
    });

    console.log('استجابة EmailJS:', {
      status: response.status,
      statusText: response.statusText
    });

    if (response.ok) {
      const responseText = await response.text();
      console.log('تم إرسال البريد بنجاح عبر EmailJS:', responseText);
      return { success: true };
    } else {
      const errorText = await response.text();
      lastError = `EmailJS Error: ${response.status} - ${errorText}`;
      console.error('فشل EmailJS:', lastError);
    }
  } catch (error) {
    lastError = `EmailJS Exception: ${error.message}`;
    console.error('خطأ في EmailJS:', error);
  }

  // محاولة ثانية مع معاملات مختلفة
  try {
    console.log('المحاولة الثانية: إرسال مع معاملات محدثة...');
    
    const alternativeParams = {
      ...templateParams,
      from_name: 'منصة كتبي',
      reply_to: 'noreply@kotobi.com',
    };

    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
      await response.text();
      console.log('تم إرسال البريد بنجاح في المحاولة الثانية');
      return { success: true };
    } else {
      const errorText = await response.text();
      lastError = `Second attempt failed: ${response.status} - ${errorText}`;
      console.error('فشلت المحاولة الثانية:', lastError);
    }
  } catch (error) {
    lastError = `Second attempt exception: ${error.message}`;
    console.error('خطأ في المحاولة الثانية:', error);
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

    const { bookId, userId, bookTitle, bookAuthor, bookCategory, userEmail, coverImageUrl }: BookApprovalEmailRequest = 
      await req.json();

    console.log('طلب إرسال بريد إلكتروني للموافقة على الكتاب:', {
      bookId,
      userId,
      bookTitle,
      bookAuthor,
      userEmail
    });

    // جلب معلومات المستخدم من profiles
    const { data: userProfile, error: userError } = await supabaseClient
      .from('profiles')
      .select('username, email')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('خطأ في جلب بيانات المستخدم:', userError);
    }

    // جلب الإيميل من auth.users كخطة بديلة إذا لم يكن موجوداً
    let authEmail: string | null = null;
    if (!userEmail && !userProfile?.email && userId) {
      try {
        const { data: authUser, error: authError } = await supabaseClient.auth.admin.getUserById(userId);
        if (!authError && authUser?.user?.email) {
          authEmail = authUser.user.email;
          console.log('تم جلب الإيميل من auth.users:', authEmail);
        } else {
          console.error('خطأ في جلب الإيميل من auth.users:', authError);
        }
      } catch (e) {
        console.error('فشل في جلب بيانات المستخدم من auth:', e);
      }
    }

    // جلب معلومات الكتاب المعتمد لإنشاء الرابط
    const { data: bookSubmission, error: bookError } = await supabaseClient
      .from('book_submissions')
      .select('slug, id, cover_image_url')
      .eq('id', bookId)
      .single();

    // استخدام صورة الغلاف من الطلب أو من قاعدة البيانات
    const bookCoverUrl = coverImageUrl || bookSubmission?.cover_image_url || '';

    let bookUrl = 'https://kotobi.xyz'; // الرابط الافتراضي للموقع
    console.log('الرابط الافتراضي:', bookUrl);
    
    if (!bookError && bookSubmission) {
      if (bookSubmission.slug) {
        bookUrl = `https://kotobi.xyz/book/${bookSubmission.slug}`;
        console.log('تم إنشاء رابط مع slug:', bookUrl);
      } else {
        bookUrl = `https://kotobi.xyz/book/${bookSubmission.id}`;
        console.log('تم إنشاء رابط مع ID:', bookUrl);
      }
    }
    
    console.log('الرابط النهائي الذي سيتم إرساله:', bookUrl);

    // إعداد معاملات البريد الإلكتروني
    const userName = userProfile?.username || userProfile?.email || 'عزيزي المستخدم';
    const targetEmail = userEmail || userProfile?.email || authEmail;
    
    console.log('البريد الإلكتروني المستهدف:', targetEmail, '| المصدر:', userEmail ? 'userEmail' : userProfile?.email ? 'profile' : authEmail ? 'auth.users' : 'لا يوجد');
    
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
      approval_date: new Date().toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
    };

    console.log('معاملات البريد الإلكتروني:', templateParams);

    // إرسال البريد الإلكتروني
    console.log('بدء استدعاء EmailJS...');
    const emailResult = await sendEmailViaEmailJS(emailJsConfig, templateParams);
    console.log('نتيجة إرسال البريد:', emailResult);

    if (emailResult.success) {
      console.log('تم إرسال بريد الموافقة بنجاح إلى:', targetEmail);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'تم إرسال بريد الموافقة بنجاح',
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
      console.error('فشل في إرسال البريد الإلكتروني:', emailResult.error);

      return new Response(
        JSON.stringify({ 
          success: false,
          message: 'فشل إرسال بريد الموافقة عبر EmailJS.',
          email: targetEmail,
          emailError: emailResult.error
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          },
          status: 502
        }
      );
    }

  } catch (error) {
    console.error('خطأ في edge function:', error);
    
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