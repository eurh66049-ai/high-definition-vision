-- إصلاح دالة get_books_batch_stats وإنشاء دالة محسنة لجلب بيانات المؤلف
-- حذف الدالة القديمة إذا كانت موجودة ولها مشاكل
DROP FUNCTION IF EXISTS public.get_books_batch_stats(uuid[]);

-- إنشاء دالة محسنة لجلب إحصائيات الكتب بدفعة واحدة بدون aggregate functions متداخلة
CREATE OR REPLACE FUNCTION public.get_books_batch_stats_fixed(book_ids uuid[])
RETURNS TABLE(
  book_id uuid,
  total_reviews integer,
  average_rating numeric,
  rating_distribution jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH book_review_stats AS (
    SELECT 
      br.book_id,
      COUNT(*)::integer as review_count,
      AVG(br.rating)::numeric as avg_rating,
      br.rating
    FROM public.book_reviews br
    WHERE br.book_id = ANY(book_ids)
    GROUP BY br.book_id, br.rating
  ),
  rating_distributions AS (
    SELECT 
      brs.book_id,
      jsonb_object_agg(
        brs.rating::text, 
        COUNT(*)::integer
      ) as distribution
    FROM book_review_stats brs
    GROUP BY brs.book_id
  ),
  book_totals AS (
    SELECT 
      br.book_id,
      COUNT(*)::integer as total_count,
      AVG(br.rating)::numeric as total_avg
    FROM public.book_reviews br
    WHERE br.book_id = ANY(book_ids)
    GROUP BY br.book_id
  )
  SELECT 
    unnest(book_ids) as book_id,
    COALESCE(bt.total_count, 0) as total_reviews,
    COALESCE(bt.total_avg, 0) as average_rating,
    COALESCE(rd.distribution, '{}'::jsonb) as rating_distribution
  FROM 
    (SELECT unnest(book_ids) as book_id) books
  LEFT JOIN book_totals bt ON bt.book_id = books.book_id
  LEFT JOIN rating_distributions rd ON rd.book_id = books.book_id;
END;
$$;

-- إنشاء دالة محسنة لجلب جميع بيانات المؤلف في طلب واحد
CREATE OR REPLACE FUNCTION public.get_complete_author_data(p_author_name text)
RETURNS TABLE(
  author_id uuid,
  author_name text,
  avatar_url text,
  bio text,
  user_id uuid,
  profile_bio text,
  profile_avatar text,
  followers_count integer,
  books_count integer,
  is_verified boolean,
  country_name text,
  social_links jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id as author_id,
    a.name as author_name,
    a.avatar_url,
    a.bio,
    a.user_id,
    p.bio as profile_bio,
    p.avatar_url as profile_avatar,
    a.followers_count,
    a.books_count,
    COALESCE(va.is_verified, false) as is_verified,
    a.country_name,
    a.social_links
  FROM public.authors a
  LEFT JOIN public.profiles p ON a.user_id = p.id
  LEFT JOIN public.verified_authors va ON a.id = va.author_id
  WHERE LOWER(TRIM(a.name)) = LOWER(TRIM(p_author_name))
  LIMIT 1;
END;
$$;