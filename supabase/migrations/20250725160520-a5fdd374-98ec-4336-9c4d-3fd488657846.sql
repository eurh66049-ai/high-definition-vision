-- إضافة pagination للدوال الموجودة
CREATE OR REPLACE FUNCTION public.get_approved_books_with_pagination(
  p_limit integer DEFAULT 24,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id text, 
  title text, 
  author text, 
  category text, 
  description text, 
  cover_image text, 
  book_type text, 
  views integer, 
  rating numeric, 
  is_free boolean, 
  created_at timestamp with time zone, 
  slug text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
    bs.slug
  FROM public.book_submissions bs
  WHERE bs.status = 'approved'
  ORDER BY bs.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- إضافة دالة للحصول على عدد الكتب المعتمدة
CREATE OR REPLACE FUNCTION public.get_approved_books_count()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  book_count integer;
BEGIN
  SELECT COUNT(*) INTO book_count
  FROM public.book_submissions bs
  WHERE bs.status = 'approved';
  
  RETURN book_count;
END;
$$;

-- إضافة دالة للحصول على التصنيفات مع pagination
CREATE OR REPLACE FUNCTION public.get_categories_with_pagination(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(category text, count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH category_data AS (
    SELECT 
      bs.category,
      COUNT(*) as count
    FROM public.book_submissions bs
    WHERE bs.status = 'approved'
      AND bs.category IS NOT NULL
      AND bs.category != ''
    GROUP BY bs.category
  )
  SELECT 
    cd.category,
    cd.count
  FROM category_data cd
  ORDER BY cd.count DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;