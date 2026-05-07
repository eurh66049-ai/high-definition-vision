-- إزالة جميع الـ triggers والدوال التي تمت إضافتها لتطبيع نبذة المؤلف

-- إزالة الـ triggers
DROP TRIGGER IF EXISTS normalize_author_bio_on_insert_update ON public.book_submissions;
DROP TRIGGER IF EXISTS normalize_author_bio_on_insert_update_authors ON public.authors;

-- إزالة الدوال
DROP FUNCTION IF EXISTS public.normalize_author_bio_trigger();
DROP FUNCTION IF EXISTS public.normalize_author_bio(text);