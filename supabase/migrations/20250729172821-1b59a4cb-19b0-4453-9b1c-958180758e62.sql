-- حذف كتب أحمد إبراهيم محمد من جدول approved_books
DELETE FROM public.approved_books 
WHERE author = 'أحمد إبراهيم محمد' OR author LIKE '%أحمد إبراهيم محمد%';

-- حذف كتب أحمد إبراهيم محمد من جدول book_submissions
DELETE FROM public.book_submissions 
WHERE author = 'أحمد إبراهيم محمد' OR author LIKE '%أحمد إبراهيم محمد%';

-- حذف بطاقة المؤلف أحمد إبراهيم محمد
DELETE FROM public.authors 
WHERE name = 'أحمد إبراهيم محمد' OR name LIKE '%أحمد إبراهيم محمد%';

-- إنشاء دالة لحذف المؤلفين الذين ليس لديهم كتب معتمدة
CREATE OR REPLACE FUNCTION public.cleanup_authors_without_books()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- حذف المؤلفين الذين ليس لديهم أي كتب معتمدة
  DELETE FROM public.authors 
  WHERE id NOT IN (
    SELECT DISTINCT a.id 
    FROM public.authors a
    INNER JOIN public.book_submissions bs 
      ON LOWER(TRIM(a.name)) = LOWER(TRIM(bs.author))
    WHERE bs.status = 'approved'
  );
  
  RETURN NULL;
END;
$function$;

-- إنشاء trigger لتنظيف المؤلفين عند حذف الكتب
DROP TRIGGER IF EXISTS cleanup_authors_on_book_delete ON public.book_submissions;
CREATE TRIGGER cleanup_authors_on_book_delete
  AFTER DELETE OR UPDATE ON public.book_submissions
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.cleanup_authors_without_books();

-- إنشاء trigger لتنظيف المؤلفين عند حذف الكتب من approved_books
DROP TRIGGER IF EXISTS cleanup_authors_on_approved_book_delete ON public.approved_books;
CREATE TRIGGER cleanup_authors_on_approved_book_delete
  AFTER DELETE ON public.approved_books
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.cleanup_authors_without_books();

-- إنشاء دالة لتنظيف المؤلفين عند تغيير حالة الكتاب من approved إلى غير approved
CREATE OR REPLACE FUNCTION public.cleanup_authors_on_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- إذا تم تغيير الحالة من approved إلى أي حالة أخرى
  IF OLD.status = 'approved' AND NEW.status != 'approved' THEN
    -- حذف المؤلف إذا لم تعد لديه كتب معتمدة
    DELETE FROM public.authors 
    WHERE LOWER(TRIM(name)) = LOWER(TRIM(OLD.author))
      AND id NOT IN (
        SELECT DISTINCT a.id 
        FROM public.authors a
        INNER JOIN public.book_submissions bs 
          ON LOWER(TRIM(a.name)) = LOWER(TRIM(bs.author))
        WHERE bs.status = 'approved'
          AND bs.id != NEW.id  -- استبعاد الكتاب الحالي
      );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- إنشاء trigger لتنظيف المؤلفين عند تغيير حالة الكتاب
DROP TRIGGER IF EXISTS cleanup_authors_on_book_status_change ON public.book_submissions;
CREATE TRIGGER cleanup_authors_on_book_status_change
  AFTER UPDATE ON public.book_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_authors_on_status_change();

-- تنظيف المؤلفين الحاليين الذين ليس لديهم كتب معتمدة
DELETE FROM public.authors 
WHERE id NOT IN (
  SELECT DISTINCT a.id 
  FROM public.authors a
  INNER JOIN public.book_submissions bs 
    ON LOWER(TRIM(a.name)) = LOWER(TRIM(bs.author))
  WHERE bs.status = 'approved'
);