-- تحديث دالة get_book_review_stats لتبحث في التقييمات بكلا الطريقتين
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
  v_md5_uuid UUID;
BEGIN
  -- تحويل ID الكتاب إلى UUID المباشر
  BEGIN
    v_book_uuid := p_book_id::UUID;
  EXCEPTION WHEN others THEN
    v_book_uuid := NULL;
  END;
  
  -- إنشاء MD5 UUID كبديل
  v_md5_uuid := md5(p_book_id)::UUID;

  RETURN QUERY
  SELECT 
    COALESCE(COUNT(*), 0)::integer as total_reviews,
    COALESCE(ROUND(AVG(br.rating), 1), 0) as average_rating,
    COALESCE(COUNT(CASE WHEN br.rating = 5 THEN 1 END), 0)::integer as five_star_count,
    COALESCE(COUNT(CASE WHEN br.rating = 4 THEN 1 END), 0)::integer as four_star_count,
    COALESCE(COUNT(CASE WHEN br.rating = 3 THEN 1 END), 0)::integer as three_star_count,
    COALESCE(COUNT(CASE WHEN br.rating = 2 THEN 1 END), 0)::integer as two_star_count,
    COALESCE(COUNT(CASE WHEN br.rating = 1 THEN 1 END), 0)::integer as one_star_count,
    COALESCE(COUNT(CASE WHEN br.recommend = true THEN 1 END), 0)::integer as recommend_count,
    COALESCE(COUNT(CASE WHEN br.recommend = false THEN 1 END), 0)::integer as not_recommend_count
  FROM 
    public.book_reviews br
  WHERE 
    br.book_id = v_book_uuid OR br.book_id = v_md5_uuid;
END;
$$;