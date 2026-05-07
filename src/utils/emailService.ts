import emailjs from '@emailjs/browser';

// إعدادات EmailJS
const EMAILJS_SERVICE_ID = 'service_tjpvbju';
const EMAILJS_TEMPLATE_ID = 'template_cps20sa';
const EMAILJS_PUBLIC_KEY = 'konoVp2jwRzSRBPaP';

// تهيئة EmailJS
emailjs.init(EMAILJS_PUBLIC_KEY);

// إعدادات إضافية لتحسين التوافق
const emailjsConfig = {
  publicKey: EMAILJS_PUBLIC_KEY,
  blockHeadless: true,
  limitRate: {
    throttle: 10000, // 10 seconds
  },
};

interface BookApprovalEmailData {
  user_name: string;
  user_email: string;
  book_title: string;
  book_author: string;
  book_category: string;
  book_url: string;
  approval_date: string;
}

/**
 * إرسال بريد إلكتروني عند الموافقة على الكتاب
 */
export const sendBookApprovalEmail = async (data: BookApprovalEmailData): Promise<boolean> => {
  try {
    console.log('إرسال بريد إلكتروني للموافقة على الكتاب:', data.book_title);
    
    // إعداد معاملات البريد الإلكتروني
    const templateParams = {
      user_name: data.user_name,
      to_email: data.user_email,
      book_title: data.book_title,
      book_author: data.book_author,
      book_category: data.book_category,
      book_url: data.book_url,
      approval_date: data.approval_date,
    };

    console.log('معاملات البريد الإلكتروني:', templateParams);

    // إرسال البريد الإلكتروني
    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams
    );

    console.log('تم إرسال البريد الإلكتروني بنجاح:', response);
    return true;

  } catch (error) {
    console.error('خطأ في إرسال البريد الإلكتروني:', error);
    return false;
  }
};

/**
 * الحصول على رابط الكتاب
 */
export const getBookUrl = (bookSlug: string): string => {
  const baseUrl = 'https://kotobi.xyz';
  return `${baseUrl}/book/${bookSlug}`;
};

/**
 * تنسيق تاريخ الموافقة
 */
export const formatApprovalDate = (date: Date = new Date()): string => {
  return date.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

interface BookRejectionEmailData {
  user_name: string;
  user_email: string;
  book_title: string;
  book_author: string;
  book_category: string;
  rejection_reason: string;
  rejection_date: string;
}

/**
 * إرسال بريد إلكتروني عند رفض الكتاب
 */
export const sendBookRejectionEmail = async (data: BookRejectionEmailData): Promise<boolean> => {
  try {
    console.log('إرسال بريد إلكتروني لرفض الكتاب:', data.book_title);
    
    // إعداد معاملات البريد الإلكتروني
    const templateParams = {
      user_name: data.user_name,
      to_email: data.user_email,
      book_title: data.book_title,
      book_author: data.book_author,
      book_category: data.book_category,
      rejection_reason: data.rejection_reason,
      rejection_date: data.rejection_date,
    };

    console.log('معاملات البريد الإلكتروني للرفض:', templateParams);

    // إرسال البريد الإلكتروني - استخدم template ID مختلف للرفض
    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      'template_rejection', // سنستخدم template مختلف للرفض
      templateParams
    );

    console.log('تم إرسال بريد الرفض بنجاح:', response);
    return true;

  } catch (error) {
    console.error('خطأ في إرسال بريد الرفض:', error);
    return false;
  }
};

/**
 * ترجمة التصنيف إلى العربية
 */
export const getCategoryLabel = (categoryKey: string): string => {
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