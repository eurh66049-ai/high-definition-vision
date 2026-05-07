-- إضافة دعم لأنواع ملفات متعددة في جدول book_submissions
-- إضافة عمود جديد لنوع الملف إذا لم يكن موجوداً
DO $$ 
BEGIN
    -- التحقق من وجود العمود قبل إضافته
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='book_submissions' AND column_name='book_file_type') THEN
        ALTER TABLE public.book_submissions 
        ADD COLUMN book_file_type TEXT DEFAULT 'pdf';
    END IF;
END $$;

-- تحديث القيم الموجودة لتعيين نوع الملف كـ PDF
UPDATE public.book_submissions 
SET book_file_type = 'pdf' 
WHERE book_file_type IS NULL AND book_file_url IS NOT NULL;

-- إضافة تعليق للعمود الجديد
COMMENT ON COLUMN public.book_submissions.book_file_type IS 'نوع ملف الكتاب: pdf, docx, txt';

-- إنشاء دالة للتحقق من صحة نوع الملف
CREATE OR REPLACE FUNCTION public.validate_book_file_type(file_type TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    RETURN file_type IN ('pdf', 'docx', 'txt');
END;
$$;

-- إضافة trigger للتحقق من نوع الملف
CREATE OR REPLACE FUNCTION public.check_book_file_type()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- التحقق من نوع الملف إذا كان موجوداً
    IF NEW.book_file_type IS NOT NULL AND NOT public.validate_book_file_type(NEW.book_file_type) THEN
        RAISE EXCEPTION 'نوع ملف غير مدعوم: %. الأنواع المدعومة: pdf, docx, txt', NEW.book_file_type;
    END IF;
    
    -- تعيين نوع الملف تلقائياً من امتداد اسم الملف إذا لم يتم تحديده
    IF NEW.book_file_type IS NULL AND NEW.book_file_url IS NOT NULL THEN
        NEW.book_file_type := CASE 
            WHEN NEW.book_file_url ILIKE '%.pdf' THEN 'pdf'
            WHEN NEW.book_file_url ILIKE '%.docx' THEN 'docx' 
            WHEN NEW.book_file_url ILIKE '%.txt' THEN 'txt'
            ELSE 'pdf'
        END;
    END IF;
    
    RETURN NEW;
END;
$$;

-- إنشاء trigger
DROP TRIGGER IF EXISTS validate_book_file_type_trigger ON public.book_submissions;
CREATE TRIGGER validate_book_file_type_trigger
    BEFORE INSERT OR UPDATE ON public.book_submissions
    FOR EACH ROW
    EXECUTE FUNCTION public.check_book_file_type();

-- تحديث الدالة get_approved_books لتشمل نوع الملف
CREATE OR REPLACE FUNCTION public.get_approved_books()
 RETURNS TABLE(id text, title text, author text, category text, description text, cover_image text, book_type text, views integer, rating numeric, is_free boolean, created_at timestamp with time zone, slug text, book_file_type text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    bs.id::text,
    bs.title,
    bs.author,
    bs.category,
    bs.description,
    bs.cover_image_url,
    'uploaded'::text as book_type,
    bs.views,
    bs.rating,
    true as is_free,
    bs.created_at,
    bs.slug,
    COALESCE(bs.book_file_type, 'pdf') as book_file_type
  FROM public.book_submissions bs
  WHERE bs.status = 'approved'
  ORDER BY bs.created_at DESC;
END;
$function$;