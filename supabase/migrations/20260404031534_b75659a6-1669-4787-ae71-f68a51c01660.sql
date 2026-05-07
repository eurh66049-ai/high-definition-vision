
CREATE OR REPLACE FUNCTION public.get_book_popularity_rank(p_book_id uuid)
RETURNS TABLE(
  popularity_rank bigint,
  total_books bigint,
  popularity_score numeric,
  category_rank bigint,
  category_total bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH book_scores AS (
    SELECT 
      ab.id,
      ab.category,
      (COALESCE(ab.views, 0) 
        + COALESCE(bs.downloads, 0) * 3 
        + (SELECT COUNT(*)::int FROM book_likes bl WHERE bl.book_id = ab.id) * 5
        + COALESCE(bs.total_reviews, 0) * 10
      )::numeric AS score
    FROM approved_books ab
    LEFT JOIN book_stats bs ON bs.book_id = ab.id
    WHERE ab.is_active = true
  ),
  ranked AS (
    SELECT 
      bs2.id,
      bs2.category,
      bs2.score,
      ROW_NUMBER() OVER (ORDER BY bs2.score DESC) AS global_rank,
      COUNT(*) OVER () AS total_count,
      ROW_NUMBER() OVER (PARTITION BY bs2.category ORDER BY bs2.score DESC) AS cat_rank,
      COUNT(*) OVER (PARTITION BY bs2.category) AS cat_total
    FROM book_scores bs2
  )
  SELECT 
    r.global_rank AS popularity_rank,
    r.total_count AS total_books,
    r.score AS popularity_score,
    r.cat_rank AS category_rank,
    r.cat_total AS category_total
  FROM ranked r
  WHERE r.id = p_book_id;
$$;
