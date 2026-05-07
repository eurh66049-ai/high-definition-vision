-- حذف الدالة القديمة وإنشاء دالة جديدة تدعم البحث بالـ slug
DROP FUNCTION IF EXISTS public.get_book_details(text);

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
  file_size bigint,
  slug text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  book_uuid UUID;
BEGIN
  -- أولاً: محاولة تحويل النص إلى UUID مباشرة
  BEGIN
    book_uuid := p_book_id::UUID;
    
    -- البحث بالـ UUID في approved_books
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
      ab.file_size,
      bs.slug
    FROM public.approved_books ab
    LEFT JOIN public.book_submissions bs ON ab.submission_id = bs.id
    WHERE ab.id = book_uuid
      AND ab.is_active = true;
      
    -- إذا وُجدت نتائج، أعد النتائج
    IF FOUND THEN
      RETURN;
    END IF;
    
  EXCEPTION WHEN others THEN
    -- إذا فشل تحويل UUID، استمر للبحث بالـ slug
  END;
  
  -- ثانياً: البحث بالـ slug في book_submissions المعتمدة
  RETURN QUERY
  SELECT 
    bs.id::text,
    bs.title,
    bs.subtitle,
    bs.author,
    bs.author_bio,
    bs.author_image_url,
    bs.category,
    bs.description,
    bs.language,
    bs.publication_year,
    bs.page_count,
    bs.cover_image_url,
    bs.book_file_url,
    bs.file_type,
    bs.display_type,
    bs.views,
    bs.rating,
    bs.created_at,
    bs.user_email,
    bs.file_size,
    bs.slug
  FROM public.book_submissions bs
  WHERE bs.slug = p_book_id
    AND bs.status = 'approved';
END;
$$;