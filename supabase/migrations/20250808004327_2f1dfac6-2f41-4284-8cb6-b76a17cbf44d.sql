-- Drop and recreate the function with user_id
DROP FUNCTION IF EXISTS public.get_author_by_slug_or_name(text);

CREATE FUNCTION public.get_author_by_slug_or_name(p_identifier text)
RETURNS TABLE(id uuid, name text, bio text, avatar_url text, email text, website text, social_links jsonb, books_count integer, followers_count integer, created_at timestamp with time zone, slug text, country_code text, country_name text, user_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- البحث بالـ slug أولاً
  RETURN QUERY
  SELECT 
    a.id,
    a.name,
    a.bio,
    a.avatar_url,
    a.email,
    a.website,
    a.social_links,
    a.books_count,
    a.followers_count,
    a.created_at,
    a.slug,
    a.country_code::text,
    a.country_name,
    a.user_id
  FROM public.authors a
  WHERE a.slug = p_identifier
  LIMIT 1;

  -- إذا لم نجد نتائج بالـ slug، ابحث بالاسم
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      a.id,
      a.name,
      a.bio,
      a.avatar_url,
      a.email,
      a.website,
      a.social_links,
      a.books_count,
      a.followers_count,
      a.created_at,
      a.slug,
      a.country_code::text,
      a.country_name,
      a.user_id
    FROM public.authors a
    WHERE LOWER(a.name) = LOWER(p_identifier)
       OR a.name ILIKE '%' || p_identifier || '%'
    ORDER BY 
      CASE WHEN LOWER(a.name) = LOWER(p_identifier) THEN 1 ELSE 2 END,
      a.books_count DESC
    LIMIT 1;
  END IF;
END;
$$;