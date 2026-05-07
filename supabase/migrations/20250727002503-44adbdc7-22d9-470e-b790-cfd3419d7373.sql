-- إنشاء دالة محسّنة للحصول على إحصائيات المراجعات مع معالجة أفضل للأخطاء
CREATE OR REPLACE FUNCTION public.get_book_review_stats(p_book_id uuid)
RETURNS TABLE(
  total_reviews integer,
  average_rating numeric,
  five_star_count integer,
  four_star_count integer,
  three_star_count integer,
  two_star_count integer,
  one_star_count integer,
  recommend_count integer,
  not_recommend_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- التحقق من أن المعرف ليس فارغاً
  IF p_book_id IS NULL THEN
    RETURN QUERY SELECT 0::integer, 0::numeric, 0::integer, 0::integer, 0::integer, 0::integer, 0::integer, 0::integer, 0::integer;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    COUNT(*)::integer as total_reviews,
    COALESCE(ROUND(AVG(rating::numeric), 1), 0) as average_rating,
    COUNT(CASE WHEN rating = 5 THEN 1 END)::integer as five_star_count,
    COUNT(CASE WHEN rating = 4 THEN 1 END)::integer as four_star_count,
    COUNT(CASE WHEN rating = 3 THEN 1 END)::integer as three_star_count,
    COUNT(CASE WHEN rating = 2 THEN 1 END)::integer as two_star_count,
    COUNT(CASE WHEN rating = 1 THEN 1 END)::integer as one_star_count,
    COUNT(CASE WHEN recommend = true THEN 1 END)::integer as recommend_count,
    COUNT(CASE WHEN recommend = false THEN 1 END)::integer as not_recommend_count
  FROM public.book_reviews 
  WHERE book_id = p_book_id;
  
  -- إذا لم نجد أي نتائج، نعيد إحصائيات فارغة
  IF NOT FOUND THEN
    RETURN QUERY SELECT 0::integer, 0::numeric, 0::integer, 0::integer, 0::integer, 0::integer, 0::integer, 0::integer, 0::integer;
  END IF;
END;
$$;

-- إنشاء دالة للتحقق من صحة UUID وتحويله
CREATE OR REPLACE FUNCTION public.safe_uuid_cast(input_text text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- التحقق من أن النص ليس فارغاً
  IF input_text IS NULL OR trim(input_text) = '' THEN
    RETURN NULL;
  END IF;
  
  -- محاولة تحويل النص إلى UUID
  BEGIN
    RETURN input_text::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    -- إذا فشل التحويل، إرجاع NULL
    RETURN NULL;
  END;
END;
$$;

-- تحديث دالة get_book_details لاستخدام التحويل الآمن
CREATE OR REPLACE FUNCTION public.get_book_details(p_book_id text)
RETURNS TABLE(id text, title text, subtitle text, author text, author_bio text, author_image_url text, publisher text, translator text, category text, description text, language text, publication_year integer, page_count integer, cover_image_url text, book_file_url text, file_type text, display_type text, views integer, rating numeric, created_at timestamp with time zone, user_email text, file_size bigint, slug text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  book_uuid UUID;
  normalized_input text;
BEGIN
  -- التحقق من صحة المدخل
  IF p_book_id IS NULL OR trim(p_book_id) = '' THEN
    RETURN;
  END IF;
  
  normalized_input := LOWER(TRIM(p_book_id));
  
  -- استخدام الدالة الآمنة لتحويل UUID
  book_uuid := public.safe_uuid_cast(p_book_id);
  
  -- إذا نجح تحويل UUID، ابحث به أولاً
  IF book_uuid IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      bs.id::text,
      bs.title,
      bs.subtitle,
      bs.author,
      bs.author_bio,
      bs.author_image_url,
      bs.publisher,
      bs.translator,
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
    WHERE bs.id = book_uuid AND bs.status = 'approved';
      
    IF FOUND THEN
      RETURN;
    END IF;
  END IF;
  
  -- إذا لم ينجح البحث بـ UUID، ابحث بـ slug
  RETURN QUERY
  SELECT 
    bs.id::text,
    bs.title,
    bs.subtitle,
    bs.author,
    bs.author_bio,
    bs.author_image_url,
    bs.publisher,
    bs.translator,
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
  WHERE (bs.slug = p_book_id OR LOWER(bs.slug) = normalized_input)
    AND bs.status = 'approved'
  LIMIT 1;
END;
$$;