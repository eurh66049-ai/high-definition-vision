import emailjs from '@emailjs/browser';

// إعدادات EmailJS لتوثيق المؤلفين
const EMAILJS_SERVICE_ID = 'service_6x3s32p';
const EMAILJS_TEMPLATE_ID = 'template_xw2uzpp';
const EMAILJS_PUBLIC_KEY = 'bNRGxHwJ9jij8eFP1';

// تهيئة EmailJS
emailjs.init(EMAILJS_PUBLIC_KEY);

interface AuthorVerificationEmailData {
  user_name: string;
  user_email: string;
  author_name: string;
  verification_date: string;
}

/**
 * إرسال بريد إلكتروني عند توثيق حساب المؤلف
 */
export const sendAuthorVerificationEmail = async (data: AuthorVerificationEmailData): Promise<boolean> => {
  try {
    console.log('📧 بدء إرسال بريد إلكتروني لتوثيق المؤلف:', {
      author: data.author_name,
      email: data.user_email,
      date: data.verification_date
    });
    
    // التحقق من صحة البريد الإلكتروني
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.user_email)) {
      console.error('❌ البريد الإلكتروني غير صحيح:', data.user_email);
      return false;
    }
    
    // إعداد معاملات البريد الإلكتروني
    const templateParams = {
      user_name: data.user_name,
      to_email: data.user_email,
      author_name: data.author_name,
      verification_date: data.verification_date,
      from_name: 'منصة كتبي',
      reply_to: 'noreply@kotobi.com'
    };

    console.log('📝 معاملات البريد الإلكتروني النهائية:', templateParams);
    console.log('🔧 إعدادات EmailJS:', {
      service: EMAILJS_SERVICE_ID,
      template: EMAILJS_TEMPLATE_ID,
      publicKey: EMAILJS_PUBLIC_KEY?.substring(0, 8) + '...'
    });

    // إرسال البريد الإلكتروني
    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams
    );

    console.log('✅ تم إرسال بريد توثيق المؤلف بنجاح!', {
      status: response.status,
      text: response.text
    });
    
    return true;

  } catch (error: any) {
    console.error('❌ خطأ في إرسال بريد توثيق المؤلف:', {
      error: error.message || error,
      stack: error.stack,
      data: data
    });
    
    // إضافة معلومات إضافية عن الخطأ
    if (error.status) {
      console.error('📊 تفاصيل الخطأ:', {
        status: error.status,
        text: error.text
      });
    }
    
    return false;
  }
};

/**
 * تنسيق تاريخ التوثيق
 */
export const formatVerificationDate = (date: Date = new Date()): string => {
  return date.toLocaleDateString('ar-EG', {
    calendar: 'gregory',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};