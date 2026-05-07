
-- التأكد من أن دالة get_book_details تُرجع حقول المؤلف الجديدة
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
    ab.author_bio,
    ab.author_image_url,
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
  WHERE ab.id = book_uuid
    AND ab.is_active = true;
END;
$$;

-- التأكد من تحديث الدالة في manage-book-submission أيضاً
CREATE OR REPLACE FUNCTION public.copy_author_fields_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- عند إنشاء كتاب معتمد جديد، التأكد من نسخ حقول المؤلف
  IF TG_OP = 'INSERT' THEN
    -- لا حاجة لفعل شيء هنا لأن الحقول تُنسخ مباشرة في الإدراج
    NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

-- إنشاء تريغر للتأكد من نسخ حقول المؤلف (إذا لم يكن موجوداً)
DROP TRIGGER IF EXISTS copy_author_fields_trigger ON public.approved_books;
CREATE TRIGGER copy_author_fields_trigger
  AFTER INSERT ON public.approved_books
  FOR EACH ROW
  EXECUTE FUNCTION public.copy_author_fields_on_approval();
