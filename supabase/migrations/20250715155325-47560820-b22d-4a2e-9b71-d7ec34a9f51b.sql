-- تحديث جميع الكتب المعتمدة لتحتوي على slug إذا لم تكن تحتوي عليه
UPDATE public.book_submissions 
SET slug = public.generate_book_slug(title, author)
WHERE status = 'approved' 
AND (slug IS NULL OR slug = '');

-- التأكد من إنشاء trigger لإنشاء slug تلقائياً للكتب الجديدة المعتمدة
CREATE OR REPLACE FUNCTION public.ensure_slug_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- إنشاء slug إذا لم يكن موجوداً وتمت الموافقة على الكتاب
  IF NEW.status = 'approved' AND (NEW.slug IS NULL OR NEW.slug = '') THEN
    NEW.slug := public.generate_book_slug(NEW.title, NEW.author);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- حذف trigger القديم إن وجد وإنشاء واحد جديد
DROP TRIGGER IF EXISTS ensure_slug_trigger ON public.book_submissions;

CREATE TRIGGER ensure_slug_trigger
  BEFORE INSERT OR UPDATE ON public.book_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_slug_on_approval();