-- إضافة دالة محدثة لجلب التقييمات مع الملفات الشخصية
CREATE OR REPLACE FUNCTION public.get_book_reviews_with_profiles(p_book_id text)
RETURNS TABLE(
  id uuid,
  book_id uuid,
  user_id uuid,
  rating integer,
  comment text,
  recommend boolean,
  created_at timestamptz,
  username text,
  avatar_url text,
  user_email text
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
    br.id,
    br.book_id,
    br.user_id,
    br.rating,
    br.comment,
    br.recommend,
    br.created_at,
    COALESCE(p.username, p.email, 'مستخدم مجهول') as username,
    p.avatar_url,
    p.email as user_email
  FROM 
    public.book_reviews br
  LEFT JOIN 
    public.profiles p ON br.user_id = p.id
  WHERE 
    br.book_id = v_book_uuid
  ORDER BY 
    br.created_at DESC;
END;
$$;