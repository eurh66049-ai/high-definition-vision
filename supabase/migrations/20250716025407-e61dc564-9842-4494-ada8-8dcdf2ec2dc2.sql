-- تحديث دالة get_book_review_stats لتقبل text بدلاً من UUID فقط
CREATE OR REPLACE FUNCTION public.get_book_review_stats(p_book_id text)
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
DECLARE
  v_book_uuid UUID;
BEGIN
  -- تحويل ID الكتاب إلى UUID
  v_book_uuid := public.book_id_to_uuid(p_book_id);

  RETURN QUERY
  SELECT 
    COUNT(*)::integer as total_reviews,
    ROUND(AVG(br.rating), 1) as average_rating,
    COUNT(CASE WHEN br.rating = 5 THEN 1 END)::integer as five_star_count,
    COUNT(CASE WHEN br.rating = 4 THEN 1 END)::integer as four_star_count,
    COUNT(CASE WHEN br.rating = 3 THEN 1 END)::integer as three_star_count,
    COUNT(CASE WHEN br.rating = 2 THEN 1 END)::integer as two_star_count,
    COUNT(CASE WHEN br.rating = 1 THEN 1 END)::integer as one_star_count,
    COUNT(CASE WHEN br.recommend = true THEN 1 END)::integer as recommend_count,
    COUNT(CASE WHEN br.recommend = false THEN 1 END)::integer as not_recommend_count
  FROM 
    public.book_reviews br
  WHERE 
    br.book_id = v_book_uuid;
END;
$$;