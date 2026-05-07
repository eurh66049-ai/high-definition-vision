-- توحيد تصنيفات الكتب بمطابقة الاسم بعد التطبيع مع جدول categories
-- نستخدم دالة normalize_author_name المتاحة لتطبيع النص العربي (ألف/مسافات/حروف صغيرة)
UPDATE public.book_submissions bs
SET category = c.name
FROM public.categories c
WHERE bs.category IS NOT NULL 
  AND bs.category <> ''
  AND public.normalize_author_name(bs.category) = public.normalize_author_name(c.name)
  AND bs.category IS DISTINCT FROM c.name;