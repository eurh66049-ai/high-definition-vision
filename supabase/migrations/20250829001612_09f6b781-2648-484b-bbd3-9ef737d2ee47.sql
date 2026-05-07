-- إنشاء جدول التصنيفات المرجعي أولاً
INSERT INTO public.categories (name, description) VALUES
-- الأدب والروايات
('novels', 'الروايات بجميع أنواعها'),
('mystery-crime', 'روايات الغموض والجريمة'),
('horror-fantasy', 'أدب الرعب والفانتازيا'),
('science-fiction', 'أدب الخيال العلمي'),
('literature', 'الأدب العام والكلاسيكي'),
('poetry', 'الشعر والدواوين الشعرية'),
('short-stories', 'المجموعات القصصية'),
('children-literature', 'أدب الأطفال'),
('memoirs-biographies', 'السير الذاتية والمذكرات'),

-- العلوم الإسلامية والدينية
('islamic-sciences', 'العلوم الإسلامية'),
('quran-interpretation', 'التفسير وعلوم القرآن'),
('hadith-studies', 'علوم الحديث'),
('islamic-ethics', 'الأخلاق الإسلامية'),
('islamic-history', 'التاريخ الإسلامي'),
('prophets-stories', 'قصص الأنبياء'),

-- الفلسفة والثقافة
('philosophy-logic', 'الفلسفة والمنطق'),
('philosophy-culture', 'الفلسفة والثقافة'),
('wisdom-thoughts', 'الحكمة والخواطر'),

-- العلوم الإنسانية
('psychology', 'علم النفس'),
('sociology', 'علم الاجتماع'),
('human-development', 'التنمية البشرية'),
('politics', 'السياسة'),
('history-civilizations', 'التاريخ والحضارات'),
('genealogy', 'الأنساب والقبائل'),

-- أخرى
('studies-research', 'دراسات وبحوث'),
('texts-essays', 'نصوص ومقالات'),
('plays-arts', 'المسرح والفنون'),
('law', 'القانون')
ON CONFLICT (name) DO NOTHING;

-- توحيد التصنيفات وتصحيحها
-- الروايات والأدب
UPDATE book_submissions SET category = 'novels' 
WHERE category IN (
  'روايات',
  'أدب/رواية',
  'رواية/فانتازيا',
  'رواية تاريخية/اجتماعية',
  'روايات بوليسية',
  'روايات تشويق وإثارة',
  'روايات/رعب',
  'روايات/غموض',
  'روايات عربية - فانتازيا - خيال علمي',
  'روايات غموض وخيال',
  'رواية/دراما/غموض',
  'رواية بوليسية/تشويق'
);

-- الغموض والجريمة
UPDATE book_submissions SET category = 'mystery-crime' 
WHERE category IN (
  'غموض/جريمة',
  'غموض/إثارة',
  'غموض/تحري',
  'غموض/قصص',
  'غموض/قصص قصيرة',
  'غموض/نفسي',
  'أدب بوليسي/تشويق وإثارة',
  'أدب بوليسي/غموض',
  'روايات بوليسية/قصص قصيرة'
);

-- الرعب والفانتازيا
UPDATE book_submissions SET category = 'horror-fantasy' 
WHERE category IN (
  'رعب/فانتازيا/تاريخية',
  'رعب/فانتازيا/نفسي',
  'رعب/فانتازيا',
  'رعب/قصص',
  'رعب/تشويق',
  'رعب/تشويق/غموض',
  'رعب/خيال',
  'رعب/خيال/غموض',
  'رعب/رواية/غموض',
  'رعب/غموض',
  'خارق/رعب/سيرة رمزية',
  'خارق/رعب/غموض',
  'أدب الفانتازيا'
);

-- الخيال العلمي
UPDATE book_submissions SET category = 'science-fiction' 
WHERE category IN (
  'روايات خيال علمي',
  'رعب/خيال علمي',
  'فانتازيا/خيال علمي'
);

-- الشعر
UPDATE book_submissions SET category = 'poetry' 
WHERE category IN (
  'شعر',
  'شعر/ديوان',
  'شعر/مجموعات شعرية',
  'شعر/مجموعة',
  'شعر/نصوص وخواطر',
  'شعر/نقد',
  'أدب/حكمة/منولوجات شعرية',
  'أدب/فلسفة/شعر نثري'
);

-- المجموعات القصصية
UPDATE book_submissions SET category = 'short-stories' 
WHERE category = 'story-collections';

-- أدب الأطفال
UPDATE book_submissions SET category = 'children-literature' 
WHERE category IN ('children', 'أدب/أطفال');

-- السير والمذكرات
UPDATE book_submissions SET category = 'memoirs-biographies' 
WHERE category IN (
  'memoirs-autobiographies',
  'أدب/سيرة',
  'أدب/سيرة ذاتية',
  'تاريخ/سيرة',
  'فن/سيرة ذاتية'
);

-- العلوم الإسلامية والدينية
UPDATE book_submissions SET category = 'quran-interpretation' 
WHERE category = 'إسلامية/تفسير';

UPDATE book_submissions SET category = 'hadith-studies' 
WHERE category = 'إسلامية/حديث';

UPDATE book_submissions SET category = 'islamic-ethics' 
WHERE category IN ('إسلامية/أخلاق وحكم', 'إسلامية/دعاء');

UPDATE book_submissions SET category = 'islamic-history' 
WHERE category IN ('تاريخ إسلامي', 'تاريخ/إسلامي');

UPDATE book_submissions SET category = 'islamic-sciences' 
WHERE category = 'إسلامية/إعجاز علمي';

-- النصوص والمقالات
UPDATE book_submissions SET category = 'texts-essays' 
WHERE category IN (
  'أدب/مقالات',
  'حِكَم/قصص/مقالات',
  'فكر/مقالات/بلاغة'
);

-- الأنساب والقبائل
UPDATE book_submissions SET category = 'genealogy' 
WHERE category IN ('أنساب وقبائل', 'تاريخ/أنساب');

-- التاريخ
UPDATE book_submissions SET category = 'history-civilizations' 
WHERE category IN ('تاريخ/سياسة', 'سياسة/تاريخ');

-- المسرح
UPDATE book_submissions SET category = 'plays-arts' 
WHERE category = 'مسرح';

-- الأدب الكلاسيكي
UPDATE book_submissions SET category = 'literature' 
WHERE category IN ('ملحمة/أدب كلاسيكي', 'ملحمة/ترجمة');