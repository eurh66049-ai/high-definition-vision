-- إنشاء دالة لإعادة حساب عدد الكتب للمؤلفين بناءً على الكتب المعتمدة فقط
CREATE OR REPLACE FUNCTION recalculate_authors_books_count()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- تحديث عدد الكتب لكل مؤلف بناءً على الكتب المعتمدة فقط
  UPDATE public.authors 
  SET books_count = (
    SELECT COUNT(*)
    FROM public.book_submissions bs
    WHERE bs.author = authors.name 
    AND bs.status = 'approved'
  );
  
  -- إدراج رسالة في الـ log
  RAISE NOTICE 'تم إعادة حساب عدد الكتب لجميع المؤلفين';
END;
$function$;

-- إنشاء دالة لإصلاح عدد الكتب لمؤلف محدد
CREATE OR REPLACE FUNCTION fix_authors_books_count(author_name text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  correct_count integer;
  updated_rows integer;
BEGIN
  -- حساب العدد الصحيح للكتب المعتمدة
  SELECT COUNT(*) INTO correct_count
  FROM public.book_submissions bs
  WHERE bs.author = author_name 
  AND bs.status = 'approved';
  
  -- تحديث عدد الكتب للمؤلف
  UPDATE public.authors 
  SET books_count = correct_count
  WHERE name = author_name;
  
  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  
  -- إرجاع العدد الصحيح
  RETURN correct_count;
END;
$function$;

-- إنشاء تريجر محسن لتحديث عدد الكتب عند تغيير حالة الكتاب
CREATE OR REPLACE FUNCTION update_author_books_count_on_status_change()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  affected_authors text[];
BEGIN
  -- تجميع أسماء المؤلفين المتأثرين
  affected_authors := ARRAY[]::text[];
  
  -- في حالة INSERT مع حالة approved
  IF TG_OP = 'INSERT' AND NEW.status = 'approved' THEN
    affected_authors := array_append(affected_authors, NEW.author);
  END IF;
  
  -- في حالة UPDATE
  IF TG_OP = 'UPDATE' THEN
    -- إذا تغيرت الحالة من أو إلى approved
    IF OLD.status != NEW.status THEN
      affected_authors := array_append(affected_authors, NEW.author);
      -- إضافة المؤلف القديم إذا تغير اسم المؤلف
      IF OLD.author != NEW.author THEN
        affected_authors := array_append(affected_authors, OLD.author);
      END IF;
    END IF;
  END IF;
  
  -- في حالة DELETE من كتاب معتمد
  IF TG_OP = 'DELETE' AND OLD.status = 'approved' THEN
    affected_authors := array_append(affected_authors, OLD.author);
  END IF;
  
  -- تحديث عدد الكتب لكل مؤلف متأثر
  IF array_length(affected_authors, 1) > 0 THEN
    FOREACH author IN ARRAY affected_authors LOOP
      UPDATE public.authors 
      SET books_count = (
        SELECT COUNT(*)
        FROM public.book_submissions bs
        WHERE bs.author = author 
        AND bs.status = 'approved'
      )
      WHERE name = author;
    END LOOP;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- حذف التريجر القديم إذا كان موجوداً
DROP TRIGGER IF EXISTS trigger_update_author_books_count ON public.book_submissions;

-- إنشاء التريجر الجديد
CREATE TRIGGER trigger_update_author_books_count
  AFTER INSERT OR UPDATE OR DELETE ON public.book_submissions
  FOR EACH ROW EXECUTE FUNCTION update_author_books_count_on_status_change();

-- تشغيل الدالة لإصلاح العدد الحالي لجميع المؤلفين
SELECT recalculate_authors_books_count();

-- إصلاح محدد للمؤلف المذكور
SELECT fix_authors_books_count('عباس مدحت البياتي') as corrected_count;