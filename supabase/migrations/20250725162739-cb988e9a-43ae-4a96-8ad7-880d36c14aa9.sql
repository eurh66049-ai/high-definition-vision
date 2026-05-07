-- إنشاء دالة لجلب الكتب بترتيب عشوائي مع pagination
CREATE OR REPLACE FUNCTION public.get_random_approved_books(p_limit integer DEFAULT 24, p_offset integer DEFAULT 0)
RETURNS TABLE(
  id uuid,
  title text,
  author text,
  category text,
  description text,
  cover_image_url text,
  views integer,
  rating numeric,
  created_at timestamp with time zone,
  language text,
  page_count integer,
  slug text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ab.id,
    ab.title,
    ab.author,
    ab.category,
    ab.description,
    ab.cover_image_url,
    ab.views,
    ab.rating,
    ab.created_at,
    ab.language,
    ab.page_count,
    ab.slug
  FROM public.approved_books ab
  WHERE ab.is_active = true
  ORDER BY RANDOM()
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;