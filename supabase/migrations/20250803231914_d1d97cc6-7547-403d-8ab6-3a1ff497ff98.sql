-- إنشاء trigger لتطبيع نبذة المؤلف تلقائياً عند الإدراج أو التحديث
CREATE OR REPLACE FUNCTION public.normalize_author_bio_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- تطبيع نبذة المؤلف إذا كانت موجودة
  IF NEW.author_bio IS NOT NULL AND NEW.author_bio != '' THEN
    NEW.author_bio := public.normalize_author_bio(NEW.author_bio);
  END IF;
  
  RETURN NEW;
END;
$$;

-- إنشاء trigger للجدول book_submissions
DROP TRIGGER IF EXISTS normalize_author_bio_on_insert_update ON public.book_submissions;
CREATE TRIGGER normalize_author_bio_on_insert_update
  BEFORE INSERT OR UPDATE ON public.book_submissions
  FOR EACH ROW 
  EXECUTE FUNCTION public.normalize_author_bio_trigger();

-- إنشاء trigger للجدول authors
DROP TRIGGER IF EXISTS normalize_author_bio_on_insert_update_authors ON public.authors;
CREATE TRIGGER normalize_author_bio_on_insert_update_authors
  BEFORE INSERT OR UPDATE ON public.authors
  FOR EACH ROW 
  EXECUTE FUNCTION public.normalize_author_bio_trigger();