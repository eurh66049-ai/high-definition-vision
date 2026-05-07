-- فهرس على عمود صورة الغلاف
CREATE INDEX IF NOT EXISTS idx_book_submissions_cover_url ON public.book_submissions(cover_image_url) 
WHERE status = 'approved' AND cover_image_url IS NOT NULL;

-- عرض مُجسَّد للكتب المعتمدة مع الأغلفة (يُخزَّن في الذاكرة للوصول السريع)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.approved_books_covers AS
SELECT 
  id,
  title,
  author,
  cover_image_url,
  category,
  slug
FROM public.book_submissions
WHERE status = 'approved' AND cover_image_url IS NOT NULL;

-- فهرس على العرض المُجسَّد
CREATE INDEX IF NOT EXISTS idx_approved_covers_id ON public.approved_books_covers(id);

-- دالة لتحديث العرض المُجسَّد
CREATE OR REPLACE FUNCTION public.refresh_approved_covers()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW public.approved_books_covers;
END;
$$;

-- دالة للحصول على أغلفة الكتب بسرعة
CREATE OR REPLACE FUNCTION public.get_book_covers(book_ids uuid[])
RETURNS TABLE (
  id uuid,
  cover_image_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT bs.id, bs.cover_image_url
  FROM public.book_submissions bs
  WHERE bs.id = ANY(book_ids) 
    AND bs.status = 'approved'
    AND bs.cover_image_url IS NOT NULL;
$$;