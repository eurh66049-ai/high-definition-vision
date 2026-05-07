-- إصلاح دالة get_book_details للتعامل الصحيح مع slug
CREATE OR REPLACE FUNCTION get_book_details(p_book_id text)
RETURNS TABLE(
  id uuid,
  title text,
  subtitle text,
  author text,
  author_image_url text,
  author_bio text,
  category text,
  description text,
  language text,
  publication_year integer,
  page_count integer,
  publisher text,
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
  v_book_uuid uuid;
  v_is_uuid boolean := false;
BEGIN
  -- التحقق إذا كان p_book_id هو UUID صالح
  BEGIN
    v_book_uuid := p_book_id::uuid;
    v_is_uuid := true;
  EXCEPTION WHEN others THEN
    v_is_uuid := false;
  END;
  
  -- البحث في قاعدة البيانات
  IF v_is_uuid THEN
    -- إذا كان UUID، ابحث بالـ id أو slug
    RETURN QUERY
    SELECT 
      bs.id,
      bs.title,
      bs.subtitle,
      bs.author,
      bs.author_image_url,
      public.get_author_bio_smart(bs.id) as author_bio,
      bs.category,
      bs.description,
      bs.language,
      bs.publication_year,
      bs.page_count,
      bs.publisher,
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
    WHERE (bs.id = v_book_uuid OR bs.slug = p_book_id)
      AND bs.status = 'approved'
    ORDER BY 
      CASE WHEN bs.id = v_book_uuid THEN 1 ELSE 2 END
    LIMIT 1;
  ELSE
    -- إذا لم يكن UUID، ابحث فقط بالـ slug
    RETURN QUERY
    SELECT 
      bs.id,
      bs.title,
      bs.subtitle,
      bs.author,
      bs.author_image_url,
      public.get_author_bio_smart(bs.id) as author_bio,
      bs.category,
      bs.description,
      bs.language,
      bs.publication_year,
      bs.page_count,
      bs.publisher,
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
      AND bs.status = 'approved'
    LIMIT 1;
  END IF;
END;
$$;