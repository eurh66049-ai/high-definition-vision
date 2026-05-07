-- إنشاء دالة محسّنة لجلب بيانات الكتب مع الإحصائيات في استعلام واحد للصفحة الرئيسية
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
    bs.rating,
    bs.views,
    bs.created_at,
    bs.slug,
    bs.language,
    bs.page_count,
    bs.book_file_type,
    bs.display_type
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
    bi.book_id::TEXT,
    COALESCE(COUNT(br.id)::INTEGER, 0) as total_reviews,
    COALESCE(AVG(br.rating), 0.0) as average_rating,
    COALESCE(
      jsonb_object_agg(
        br.rating::TEXT, 
        rating_count
      ) FILTER (WHERE br.rating IS NOT NULL),
      '{}'::jsonb
    ) as rating_distribution
  FROM (
    SELECT unnest(book_ids::UUID[]) as book_id
  ) bi
  LEFT JOIN public.book_reviews br ON br.book_id = bi.book_id
  LEFT JOIN (
    SELECT 
      book_id,
      rating,
      COUNT(*) as rating_count
    FROM public.book_reviews
    WHERE book_id = ANY(book_ids::UUID[])
    GROUP BY book_id, rating
  ) rating_counts ON rating_counts.book_id = br.book_id AND rating_counts.rating = br.rating
  GROUP BY bi.book_id;
END;
$$;