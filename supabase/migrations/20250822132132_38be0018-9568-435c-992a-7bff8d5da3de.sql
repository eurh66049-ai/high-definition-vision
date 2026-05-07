-- إنشاء دالة مساعدة للبحث عن الكتب مع تطبيع أسماء المؤلفين
CREATE OR REPLACE FUNCTION public.find_existing_book_with_normalized_author(
  p_title text,
  p_author text,
  p_status text DEFAULT 'approved'
)
RETURNS TABLE(id uuid, title text, author text, status text)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT bs.id, bs.title, bs.author, bs.status
  FROM public.book_submissions bs
  WHERE LOWER(TRIM(bs.title)) = LOWER(TRIM(p_title))
    AND public.normalize_author_name(bs.author) = public.normalize_author_name(p_author)
    AND bs.status = p_status
  LIMIT 1;
END;
$$;