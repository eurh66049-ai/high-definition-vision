-- تعطيل جميع triggers منع الكتب المكررة مؤقتاً
DROP TRIGGER IF EXISTS prevent_duplicate_books_trigger ON public.book_submissions;

-- إنشاء trigger لإنشاء slug تلقائياً للكتب الجديدة
CREATE OR REPLACE FUNCTION public.auto_generate_book_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- إنشاء slug إذا لم يكن موجوداً وتمت الموافقة على الكتاب
  IF NEW.status = 'approved' AND (NEW.slug IS NULL OR NEW.slug = '') THEN
    NEW.slug := public.generate_book_slug(NEW.title, NEW.author);
  END IF;
  
  RETURN NEW;
END;
$$;

-- إضافة trigger لـ book_submissions
DROP TRIGGER IF EXISTS trigger_auto_generate_book_slug ON public.book_submissions;
CREATE TRIGGER trigger_auto_generate_book_slug
  BEFORE INSERT OR UPDATE ON public.book_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_book_slug();

-- الآن تحديث الكتب الموجودة لإنشاء slugs
UPDATE public.book_submissions 
SET slug = public.generate_book_slug(title, author)
WHERE status = 'approved' AND (slug IS NULL OR slug = '');