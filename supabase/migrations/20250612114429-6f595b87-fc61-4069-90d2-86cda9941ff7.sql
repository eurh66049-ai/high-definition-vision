
-- تحديث الدالة لضمان نسخ بيانات المؤلف بشكل صحيح عند الموافقة
CREATE OR REPLACE FUNCTION public.copy_author_fields_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- عند إنشاء كتاب معتمد جديد، التأكد من نسخ حقول المؤلف من book_submissions
  IF TG_OP = 'INSERT' AND NEW.submission_id IS NOT NULL THEN
    -- نسخ بيانات المؤلف من جدول book_submissions
    UPDATE public.approved_books 
    SET 
      author_bio = (
        SELECT bs.author_bio 
        FROM public.book_submissions bs 
        WHERE bs.id = NEW.submission_id
      ),
      author_image_url = (
        SELECT bs.author_image_url 
        FROM public.book_submissions bs 
        WHERE bs.id = NEW.submission_id
      )
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- إعادة إنشاء التريغر للتأكد من عمله بشكل صحيح
DROP TRIGGER IF EXISTS copy_author_fields_trigger ON public.approved_books;
CREATE TRIGGER copy_author_fields_trigger
  AFTER INSERT ON public.approved_books
  FOR EACH ROW
  EXECUTE FUNCTION public.copy_author_fields_on_approval();

-- إصلاح البيانات الموجودة - نسخ بيانات المؤلف من book_submissions إلى approved_books
UPDATE public.approved_books 
SET 
  author_bio = bs.author_bio,
  author_image_url = bs.author_image_url
FROM public.book_submissions bs
WHERE approved_books.submission_id = bs.id
  AND bs.author_bio IS NOT NULL 
  AND bs.author_image_url IS NOT NULL
  AND (approved_books.author_bio IS NULL OR approved_books.author_image_url IS NULL);

-- تحديث دالة get_book_details للتأكد من إرجاع البيانات الصحيحة
CREATE OR REPLACE FUNCTION public.get_book_details(p_book_id text)
RETURNS TABLE(
  id text, 
  title text, 
  subtitle text, 
  author text, 
  author_bio text, 
  author_image_url text, 
  category text, 
  description text, 
  language text, 
  publication_year integer, 
  page_count integer, 
  cover_image_url text, 
  book_file_url text, 
  file_type text, 
  display_type text, 
  views integer, 
  rating numeric, 
  created_at timestamp with time zone, 
  user_email text, 
  file_size bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  book_uuid UUID;
BEGIN
  -- تحويل النص إلى UUID إذا أمكن
  BEGIN
    book_uuid := p_book_id::UUID;
  EXCEPTION WHEN others THEN
    RETURN;
  END;
  
  RETURN QUERY
  SELECT 
    ab.id::text,
    ab.title,
    ab.subtitle,
    ab.author,
    COALESCE(ab.author_bio, bs.author_bio) as author_bio,
    COALESCE(ab.author_image_url, bs.author_image_url) as author_image_url,
    ab.category,
    ab.description,
    ab.language,
    ab.publication_year,
    ab.page_count,
    ab.cover_image_url,
    ab.book_file_url,
    ab.file_type,
    ab.display_type,
    ab.views,
    ab.rating,
    ab.created_at,
    ab.user_email,
    ab.file_size
  FROM public.approved_books ab
  LEFT JOIN public.book_submissions bs ON ab.submission_id = bs.id
  WHERE ab.id = book_uuid
    AND ab.is_active = true;
END;
$$;
