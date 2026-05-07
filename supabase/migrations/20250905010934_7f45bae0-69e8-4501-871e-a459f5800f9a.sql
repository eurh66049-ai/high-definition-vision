-- حذف الدالة الموجودة وإعادة إنشائها بالمعاملات الصحيحة
DROP FUNCTION IF EXISTS public.get_complete_author_data(text);

CREATE OR REPLACE FUNCTION public.get_complete_author_data(p_author_name text)
RETURNS TABLE(
  author_id uuid,
  author_name text,
  bio text,
  avatar_url text,
  profile_avatar text,
  profile_bio text,
  email text,
  website text,
  social_links jsonb,
  books_count integer,
  followers_count integer,
  created_at timestamp with time zone,
  slug text,
  country_code text,
  country_name text,
  user_id uuid,
  is_verified boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id as author_id,
    a.name as author_name,
    a.bio,
    a.avatar_url,
    p.avatar_url as profile_avatar,
    p.bio as profile_bio,
    a.email,
    a.website,
    a.social_links,
    a.books_count,
    a.followers_count,
    a.created_at,
    a.slug,
    a.country_code::text,
    a.country_name,
    a.user_id,
    COALESCE(v.is_verified, false) as is_verified
  FROM public.authors a
  LEFT JOIN public.profiles p ON a.user_id = p.id
  LEFT JOIN public.verified_authors v ON a.id = v.author_id
  WHERE a.name = p_author_name
     OR a.slug = p_author_name
     OR LOWER(a.name) = LOWER(p_author_name)
  ORDER BY 
    CASE WHEN a.name = p_author_name THEN 1
         WHEN a.slug = p_author_name THEN 2  
         WHEN LOWER(a.name) = LOWER(p_author_name) THEN 3
         ELSE 4 END
  LIMIT 1;
END;
$$;