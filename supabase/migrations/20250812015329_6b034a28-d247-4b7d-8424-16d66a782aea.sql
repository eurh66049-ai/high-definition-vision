-- إنشاء دالة لجلب الكتب بترتيب عشوائي يتجدد كل ساعتين
CREATE OR REPLACE FUNCTION public.get_optimized_books_home_shuffled(
  p_limit integer DEFAULT 24,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  title text,
  author text,
  category text,
  cover_image_url text,
  rating numeric,
  views integer,
  created_at timestamp with time zone,
  slug text,
  language text,
  page_count integer,
  book_file_type text,
  display_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_seed bigint;
BEGIN
  -- حساب seed بناءً على الساعة الحالية (يتغير كل ساعتين)
  v_seed := EXTRACT(EPOCH FROM date_trunc('hour', NOW()))::bigint / 7200;
  
  -- استخدام seed لإنشاء ترتيب عشوائي ثابت لفترة ساعتين
  PERFORM setseed((v_seed % 1000000)::float8 / 1000000);
  
  RETURN QUERY
  SELECT 
    bs.id,
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
  ORDER BY random()
  LIMIT p_limit OFFSET p_offset;
END;
$$;