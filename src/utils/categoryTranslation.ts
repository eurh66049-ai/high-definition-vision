import { getCategoryLabel, BOOK_CATEGORIES } from './bookCategories';

const COMPREHENSIVE_CATEGORY_TRANSLATIONS: Record<string, string> = {
  // التصنيفات المرجعية الجديدة (من المايجريشن)
  'novels': 'روايات',
  'mystery-crime': 'غموض وجريمة',
  'horror-fantasy': 'رعب وفانتازيا',
  'science-fiction': 'خيال علمي',
  'literature': 'أدب',
  'poetry': 'شعر',
  'short-stories': 'قصص قصيرة',
  'children-literature': 'أدب الأطفال',
  'memoirs-biographies': 'مذكرات وسير ذاتية',
  'islamic-sciences': 'العلوم الإسلامية',
  'quran-interpretation': 'تفسير القرآن',
  'hadith-studies': 'علوم الحديث',
  'islamic-ethics': 'الأخلاق الإسلامية',
  'islamic-history': 'التاريخ الإسلامي',
  'prophets-stories': 'قصص الأنبياء',
  'philosophy-logic': 'الفلسفة والمنطق',
  'philosophy-culture': 'فلسفة وثقافة',
  'wisdom-thoughts': 'الحكمة والخواطر',
  'psychology': 'علم النفس',
  'sociology': 'علم الاجتماع',
  'human-development': 'التنمية البشرية',
  'politics': 'السياسة',
  'history-civilizations': 'التاريخ والحضارات',
  'genealogy': 'الأنساب والقبائل',
  'studies-research': 'دراسات وبحوث',
  'texts-essays': 'نصوص ومقالات',
  'plays-arts': 'المسرح والفنون',
  'law': 'القانون',
  
  // التصنيفات القديمة للتوافق مع الإصدارات السابقة
  'story-collections': 'مجموعات قصصية',
  'memoirs-autobiographies': 'مذكرات وسير ذاتية',
  'medicine-nursing': 'طب وتمريض',
  'love-relationships': 'حب وعلاقات',
  'personal-development': 'تطوير الذات',
  'Human Development': 'تطوير الذات',
  
  // باقي التصنيفات
  'fiction': 'خيال',
  'non-fiction': 'غير خيالي',
  'science': 'علوم',
  'history': 'تاريخ',
  'biography': 'سيرة ذاتية',
  'religion': 'دين',
  'philosophy': 'فلسفة',
  'education': 'تعليم',
  'health': 'صحة',
  'technology': 'تكنولوجيا',
  'business': 'أعمال',
  'economics': 'اقتصاد',
  'art': 'فن',
  'music': 'موسيقى',
  'sports': 'رياضة',
  'cooking': 'طبخ',
  'travel': 'سفر',
  'children': 'أطفال',
  'youth': 'شباب',
  'self-help': 'تطوير الذات',
  'reference': 'مراجع',
  'textbook': 'كتب دراسية',
  'academic': 'أكاديمي',
  'research': 'بحوث',
  'journalism': 'صحافة',
  'autobiography': 'سيرة ذاتية',
  'memoir': 'مذكرات',
  'essay': 'مقالات',
  'drama': 'دراما',
  'comedy': 'كوميديا',
  'thriller': 'إثارة',
  'mystery': 'غموض',
  'romance': 'رومانسية',
  'adventure': 'مغامرة',
  'fantasy': 'فانتازيا',
  'horror': 'رعب',
  'crime': 'جريمة',
  'war': 'حرب',
  'military': 'عسكري',
  'medicine': 'طب',
  'engineering': 'هندسة',
  'mathematics': 'رياضيات',
  'physics': 'فيزياء',
  'chemistry': 'كيمياء',
  'biology': 'أحياء',
  'geography': 'جغرافيا',
  'astronomy': 'فلك',
  'environment': 'بيئة',
  'nature': 'طبيعة',
  'animal': 'حيوانات',
  'plant': 'نباتات',
  'collections': 'مجموعات',
  'other': 'أخرى',
  
  // إضافات للترجمات المتنوعة
  'islamic-science': 'العلوم الإسلامية',
  'islamic': 'إسلامي',
  'religious-studies': 'الدراسات الدينية',
  'islamiyat': 'العلوم الإسلامية',
  'islamiyat-studies': 'العلوم الإسلامية',
  'islamic books': 'كتب إسلامية',
  'islamic-book': 'كتب إسلامية',
  'quran': 'القرآن الكريم',
  'hadith': 'الحديث الشريف',
  'tafseer': 'تفسير',
  'aqeedah': 'العقيدة الإسلامية',
  'fiqh': 'الفقه الإسلامي',
  'sufism': 'التصوف',
  'Sufism': 'التصوف'
};

export const getCategoryInArabic = (category: string): string => {
  if (!category) return 'أخرى';
  
  // تنظيف وتحويل لصيغة موحدة
  const cleanCategory = category
    .toLowerCase()
    .trim()
    .replace(/[_\s]+/g, '-')
    .replace(/[-]+/g, '-');

  // البحث المباشر في قاموس الترجمات الشامل بدون تنظيف أولاً
  if (COMPREHENSIVE_CATEGORY_TRANSLATIONS[category]) {
    return COMPREHENSIVE_CATEGORY_TRANSLATIONS[category];
  }
  
  // البحث المباشر في قاموس الترجمات الشامل بعد التنظيف
  if (COMPREHENSIVE_CATEGORY_TRANSLATIONS[cleanCategory]) {
    return COMPREHENSIVE_CATEGORY_TRANSLATIONS[cleanCategory];
  }

  // البحث في تصنيفات النظام الموجودة
  const foundCategory = BOOK_CATEGORIES.find(cat =>
    cat.value.toLowerCase() === cleanCategory ||
    cat.value.toLowerCase().replace(/-/g, '_') === cleanCategory ||
    cat.value.toLowerCase().replace(/_/g, '-') === cleanCategory ||
    cat.value.toLowerCase().replace(/[_-]/g, '') === cleanCategory.replace(/[_-]/g, '')
  );
  
  if (foundCategory) {
    return foundCategory.label;
  }

  // البحث بمطابقة جزئية للكلمات المفتاحية
  const categoryLower = cleanCategory.toLowerCase();
  
  // معالجة التصنيفات الإسلامية
  if (categoryLower.includes('islam') || categoryLower.includes('islamic')) {
    return 'العلوم الإسلامية';
  }
  
  // معالجة تصنيفات الأدب
  if (categoryLower.includes('novel') || categoryLower.includes('story')) {
    return 'روايات';
  }
  
  if (categoryLower.includes('philosoph')) {
    return 'فلسفة';
  }
  
  if (categoryLower.includes('literatur')) {
    return 'أدب';
  }
  
  if (categoryLower.includes('politic')) {
    return 'سياسة';
  }
  
  if (categoryLower.includes('medicine') || categoryLower.includes('medical')) {
    return 'طب';
  }
  
  if (categoryLower.includes('memoir') || categoryLower.includes('autobiograph')) {
    return 'مذكرات وسير ذاتية';
  }

  // إذا كان التصنيف بالعربية أصلاً، إرجاعه كما هو
  if (/[\u0600-\u06FF]/.test(category)) {
    return category;
  }

  // بشكل افتراضي: تحويل الشرطات إلى مساحات وكتابة الحرف الأول بحروف كبيرة
  return cleanCategory
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// دالة لتحويل النص العربي إلى المفتاح الإنجليزي للبحث في قاعدة البيانات
export const getEnglishCategoryKey = (arabicCategory: string): string => {
  // البحث عن التصنيف المقابل بالإنجليزية
  for (const [englishKey, arabicValue] of Object.entries(COMPREHENSIVE_CATEGORY_TRANSLATIONS)) {
    if (arabicValue === arabicCategory) {
      return englishKey;
    }
  }
  
  // البحث في تصنيفات النظام
  const foundCategory = BOOK_CATEGORIES.find(cat => cat.label === arabicCategory);
  if (foundCategory) {
    return foundCategory.value;
  }
  
  // إذا كان التصنيف بالإنجليزية أصلاً، إرجاعه كما هو
  if (COMPREHENSIVE_CATEGORY_TRANSLATIONS[arabicCategory]) {
    return arabicCategory;
  }
  
  // إذا لم نجد مطابقة، نرجع النص كما هو
  return arabicCategory;
};