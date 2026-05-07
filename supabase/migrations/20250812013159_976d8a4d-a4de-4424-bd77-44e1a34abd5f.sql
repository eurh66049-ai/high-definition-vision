-- حذف الدالة الموجودة أولاً ثم إعادة إنشائها محسّنة
DROP FUNCTION IF EXISTS public.get_optimized_books_home(integer, integer);

-- إنشاء دالة محسّنة لجلب بيانات الكتب للصفحة الرئيسية
CREATE OR REPLACE FUNCTION public.get_optimized_books_home(
  p_limit INTEGER DEFAULT 24,
  p_offset INTEGER DEFAULT 0
) RETURNS TABLE(
  id TEXT,
  title TEXT,
  author TEXT,
  category TEXT,
  cover_image_url TEXT,
  rating NUMERIC,
  views INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  slug TEXT,
  language TEXT,
  page_count INTEGER,
  book_file_type TEXT,
  display_type TEXT
) SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bs.id::TEXT,
    bs.title,
    bs.author,
    bs.category,
    bs.cover_image_url,
    COALESCE(bs.rating, 0.0) as rating,
    COALESCE(bs.views, 0) as views,
    bs.created_at,
    bs.slug,
    COALESCE(bs.language, 'العربية') as language,
    COALESCE(bs.page_count, 0) as page_count,
    COALESCE(bs.book_file_type, 'pdf') as book_file_type,
    COALESCE(bs.display_type, 'free') as display_type
  FROM public.book_submissions bs
  WHERE bs.status = 'approved'
  ORDER BY bs.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- إنشاء دالة لجلب إحصائيات التقييمات لعدة كتب في استعلام واحد
CREATE OR REPLACE FUNCTION public.get_books_batch_stats(
  book_ids TEXT[]
) RETURNS TABLE(
  book_id TEXT,
  total_reviews INTEGER,
  average_rating NUMERIC,
  rating_distribution JSONB
) SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    book_uuid::TEXT as book_id,
    COALESCE(COUNT(br.id)::INTEGER, 0) as total_reviews,
    COALESCE(AVG(br.rating), 0.0) as average_rating,
    COALESCE(
      jsonb_object_agg(
        br.rating::TEXT, 
        COUNT(br.id)
      ) FILTER (WHERE br.rating IS NOT NULL),
      '{}'::jsonb
    ) as rating_distribution
  FROM (
    SELECT DISTINCT unnest(book_ids::UUID[]) as book_uuid
  ) bi
  LEFT JOIN public.book_reviews br ON br.book_id = bi.book_uuid
  GROUP BY bi.book_uuid;
END;
$$;