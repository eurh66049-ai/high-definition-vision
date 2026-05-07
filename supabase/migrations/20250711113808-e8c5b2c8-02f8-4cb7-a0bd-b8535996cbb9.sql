-- تحديث دالة get_approved_books لتشمل slug
CREATE OR REPLACE FUNCTION public.get_approved_books()
RETURNS TABLE(id text, title text, author text, category text, description text, cover_image text, book_type text, views integer, rating numeric, is_free boolean, created_at timestamp with time zone, slug text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bs.id::text,
    bs.title,
    bs.author,
    bs.category,
    bs.description,
    bs.cover_image_url,
    'uploaded'::text as book_type,
    bs.views,
    bs.rating,
    true as is_free,
    bs.created_at,
    bs.slug
  FROM public.book_submissions bs
  WHERE bs.status = 'approved'
  ORDER BY bs.created_at DESC;
END;
$$;

-- تحديث دالة get_all_books أيضاً
CREATE OR REPLACE FUNCTION public.get_all_books()
RETURNS TABLE(id text, title text, author text, category text, description text, cover_image text, book_type text, views integer, rating numeric, is_free boolean, created_at timestamp with time zone, slug text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- إرجاع الكتب المعتمدة من قاعدة البيانات
  RETURN QUERY
  SELECT 
    bs.id::text,
    bs.title,
    bs.author,
    bs.category,
    bs.description,
    bs.cover_image_url,
    'uploaded'::text as book_type,
    bs.views,
    bs.rating,
    true as is_free,
    bs.created_at,
    bs.slug
  FROM public.book_submissions bs
  WHERE bs.status = 'approved'
  ORDER BY bs.created_at DESC;
END;
$$;