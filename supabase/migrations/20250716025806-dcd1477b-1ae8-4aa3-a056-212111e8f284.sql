-- إصلاح دالة book_id_to_uuid لتتعامل مع UUID مباشرة
CREATE OR REPLACE FUNCTION public.book_id_to_uuid(p_book_id text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_uuid UUID;
BEGIN
  -- محاولة تحويل ID إلى UUID مباشرة
  BEGIN
    v_uuid := p_book_id::UUID;
    RETURN v_uuid;
  EXCEPTION WHEN others THEN
    -- إذا فشل التحويل، استخدم MD5 لإنشاء UUID ثابت
    RETURN md5(p_book_id)::UUID;
  END;
END;
$$;

-- تحديث دالة get_book_review_stats بشكل مبسط
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
  BEGIN
    v_book_uuid := p_book_id::UUID;
  EXCEPTION WHEN others THEN
    -- إذا لم ينجح التحويل المباشر، استخدم MD5
    v_book_uuid := md5(p_book_id)::UUID;
  END;

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
    br.book_id = v_book_uuid;
END;
$$;