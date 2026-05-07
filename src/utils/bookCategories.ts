
// قائمة موحدة بجميع تصنيفات الكتب - محدثة لتتماشى مع التصنيفات المرجعية
export const BOOK_CATEGORIES = [
  // التصنيفات الأساسية المرجعية
  { value: 'novels', label: 'روايات' },
  { value: 'mystery-crime', label: 'غموض وجريمة' },
  { value: 'horror-fantasy', label: 'رعب وفانتازيا' },
  { value: 'science-fiction', label: 'خيال علمي' },
  { value: 'literature', label: 'أدب' },
  { value: 'poetry', label: 'شعر' },
  { value: 'short-stories', label: 'قصص قصيرة' },
  { value: 'children-literature', label: 'أدب الأطفال' },
  { value: 'memoirs-biographies', label: 'مذكرات وسير ذاتية' },
  
  // العلوم الإسلامية والدينية
  { value: 'islamic-sciences', label: 'العلوم الإسلامية' },
  { value: 'quran-interpretation', label: 'تفسير القرآن' },
  { value: 'hadith-studies', label: 'علوم الحديث' },
  { value: 'islamic-ethics', label: 'الأخلاق الإسلامية' },
  { value: 'islamic-history', label: 'التاريخ الإسلامي' },
  { value: 'prophets-stories', label: 'قصص الأنبياء' },
  
  // الفلسفة والثقافة
  { value: 'philosophy-logic', label: 'الفلسفة والمنطق' },
  { value: 'philosophy-culture', label: 'الفلسفة والثقافة' },
  { value: 'wisdom-thoughts', label: 'الحكمة والخواطر' },
  
  // العلوم الإنسانية
  { value: 'psychology', label: 'علم النفس' },
  { value: 'sociology', label: 'علم الاجتماع' },
  { value: 'human-development', label: 'التنمية البشرية' },
  { value: 'politics', label: 'السياسة' },
  { value: 'history-civilizations', label: 'التاريخ والحضارات' },
  { value: 'genealogy', label: 'الأنساب والقبائل' },
  
  // باقي التصنيفات
  { value: 'studies-research', label: 'دراسات وبحوث' },
  { value: 'texts-essays', label: 'نصوص ومقالات' },
  { value: 'plays-arts', label: 'المسرح والفنون' },
  { value: 'law', label: 'القانون' },
  
  // التصنيفات المتخصصة الإضافية
  { value: 'education-pedagogy', label: 'التعليم والتربية' },
  { value: 'love-relationships', label: 'الحب والعلاقات' },
  { value: 'prophetic-biography', label: 'السيرة النبوية' },
  { value: 'successors-followers', label: 'سيرة الخلفاء والتابعين' },
  { value: 'marketing-business', label: 'التسويق وإدارة الأعمال' },
  { value: 'sciences', label: 'العلوم' },
  { value: 'arabic-learning', label: 'تعلم اللغة العربية' },
  { value: 'womens-culture', label: 'ثقافة المرأة' },
  { value: 'translation-dictionaries', label: 'الترجمة ومعاجم' },
  { value: 'economics', label: 'الاقتصاد' },
  { value: 'sufism', label: 'الصوفية' },
  { value: 'english-learning', label: 'تعلم اللغة الإنجليزية' },
  { value: 'medicine-nursing', label: 'الطب والتمريض' },
  { value: 'communication-media', label: 'التواصل والإعلام' },
  { value: 'nutrition', label: 'التغذية' },
  { value: 'programming', label: 'البرمجة' },
  { value: 'alternative-medicine', label: 'الأعشاب والطب البديل' },
  { value: 'mathematics', label: 'الرياضيات' },
  { value: 'computer-science', label: 'علوم الحاسوب' },
  { value: 'french-learning', label: 'تعلم اللغة الفرنسية' },
  { value: 'military-sciences', label: 'الحرب والعلوم العسكرية' },
  { value: 'spanish-learning', label: 'تعلم اللغة الإسبانية' },
  { value: 'photography', label: 'التصوير الفوتوغرافي' },
  { value: 'cooking', label: 'الطبخ' },
  { value: 'magazines', label: 'مجلات' },
  { value: 'dream-interpretation', label: 'تفاسير الأحلام' },
  { value: 'encyclopedias', label: 'المصاحف' },
  { value: 'german-learning', label: 'تعلم اللغة الألمانية' }
] as const;

// دالة للحصول على التصنيف باللغة العربية
export const getCategoryLabel = (categoryValue: string): string => {
  const category = BOOK_CATEGORIES.find(cat => cat.value === categoryValue);
  return category ? category.label : categoryValue;
};

// دالة للحصول على قيمة التصنيف من اللغة العربية
export const getCategoryValue = (categoryLabel: string): string => {
  const category = BOOK_CATEGORIES.find(cat => cat.label === categoryLabel);
  return category ? category.value : categoryLabel;
};

// مصفوفة بقيم التصنيفات للاستخدام في النماذج
export const CATEGORY_VALUES = BOOK_CATEGORIES.map(cat => cat.value);

// مصفوفة بتسميات التصنيفات للعرض
export const CATEGORY_LABELS = BOOK_CATEGORIES.map(cat => cat.label);

// دالة للبحث في التصنيفات
export const searchCategories = (searchTerm: string) => {
  return BOOK_CATEGORIES.filter(cat => 
    cat.label.includes(searchTerm) || 
    cat.value.includes(searchTerm.toLowerCase())
  );
};

// تجميع التصنيفات حسب المجال
export const CATEGORY_GROUPS = {
  literature: BOOK_CATEGORIES.filter(cat => 
    ['novels', 'fiction', 'non-fiction', 'poetry', 'literature', 'drama', 'comedy'].includes(cat.value)
  ),
  sciences: BOOK_CATEGORIES.filter(cat => 
    ['science', 'mathematics', 'physics', 'chemistry', 'biology', 'engineering'].includes(cat.value)
  ),
  social: BOOK_CATEGORIES.filter(cat => 
    ['history', 'politics', 'sociology', 'psychology', 'economics', 'philosophy'].includes(cat.value)
  ),
  education: BOOK_CATEGORIES.filter(cat => 
    ['education', 'textbook', 'academic', 'research', 'children', 'youth'].includes(cat.value)
  ),
  health: BOOK_CATEGORIES.filter(cat => 
    ['health', 'medicine', 'nutrition', 'fitness'].includes(cat.value)
  ),
  arts: BOOK_CATEGORIES.filter(cat => 
    ['art', 'music'].includes(cat.value)
  ),
  lifestyle: BOOK_CATEGORIES.filter(cat => 
    ['cooking', 'travel', 'sports', 'self-help'].includes(cat.value)
  )
};
