-- إصلاح دالة get_books_batch_stats_fixed لتحسين الأداء
DROP FUNCTION IF EXISTS get_books_batch_stats_fixed(UUID[]);

CREATE OR REPLACE FUNCTION get_books_batch_stats_fixed(book_ids UUID[])
RETURNS TABLE (
  book_id UUID,
  total_reviews INTEGER,
  average_rating NUMERIC,
  rating_distribution JSONB
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    unnest(book_ids) as book_id,
    COALESCE(reviews.total_reviews, 0) as total_reviews,
    COALESCE(reviews.average_rating, 0.0) as average_rating,
    COALESCE(reviews.rating_distribution, '{"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}'::jsonb) as rating_distribution
  FROM unnest(book_ids) book_id
  LEFT JOIN (
    SELECT 
      br.book_id,
      COUNT(*)::INTEGER as total_reviews,
      ROUND(AVG(br.rating), 2) as average_rating,
      jsonb_build_object(
        '1', COUNT(*) FILTER (WHERE br.rating = 1),
        '2', COUNT(*) FILTER (WHERE br.rating = 2), 
        '3', COUNT(*) FILTER (WHERE br.rating = 3),
        '4', COUNT(*) FILTER (WHERE br.rating = 4),
        '5', COUNT(*) FILTER (WHERE br.rating = 5)
      ) as rating_distribution
    FROM book_reviews br
    WHERE br.book_id = ANY(book_ids)
    GROUP BY br.book_id
  ) reviews ON reviews.book_id = unnest.unnest;
END;
$$;