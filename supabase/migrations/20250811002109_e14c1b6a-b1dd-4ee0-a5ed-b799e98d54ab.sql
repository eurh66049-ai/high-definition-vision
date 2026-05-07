-- حذف الدالة الموجودة وإنشاء دالة جديدة
DROP FUNCTION IF EXISTS public.get_book_submissions_with_edit_info(text);

CREATE OR REPLACE FUNCTION public.get_book_submissions_with_edit_info(status_filter text)
RETURNS TABLE (
  id uuid,
  title text,
  subtitle text,
  author text,
  category text,
  publisher text,
  translator text,
  description text,
  language text,
  publication_year integer,
  page_count integer,
  cover_image_url text,
  book_file_url text,
  file_type text,
  display_type text,
  rights_confirmation boolean,
  created_at timestamp with time zone,
  status text,
  user_id uuid,
  user_email text,
  reviewer_notes text,
  reviewed_at timestamp with time zone,
  is_edit_request boolean,
  original_book_id uuid,
  edit_requested_at timestamp with time zone,
  original_title text,
  original_author text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bs.id,
    bs.title,
    bs.subtitle,
    bs.author,
    bs.category,
    bs.publisher,
    bs.translator,
    bs.description,
    bs.language,
    bs.publication_year,
    bs.page_count,
    bs.cover_image_url,
    bs.book_file_url,
    bs.file_type,
    bs.display_type,
    bs.rights_confirmation,
    bs.created_at,
    bs.status,
    bs.user_id,
    bs.user_email,
    bs.reviewer_notes,
    bs.reviewed_at,
    bs.is_edit_request,
    bs.original_book_id,
    bs.edit_requested_at,
    CASE 
      WHEN bs.is_edit_request = true AND bs.original_book_id IS NOT NULL THEN
        (SELECT original.title FROM public.book_submissions original WHERE original.id = bs.original_book_id)
      ELSE NULL
    END as original_title,
    CASE 
      WHEN bs.is_edit_request = true AND bs.original_book_id IS NOT NULL THEN
        (SELECT original.author FROM public.book_submissions original WHERE original.id = bs.original_book_id)
      ELSE NULL
    END as original_author
  FROM public.book_submissions bs
  WHERE 
    CASE 
      WHEN status_filter = 'pending_edit' THEN bs.status = 'pending_edit' AND bs.is_edit_request = true
      WHEN status_filter = 'pending' THEN bs.status = 'pending' AND (bs.is_edit_request = false OR bs.is_edit_request IS NULL)
      ELSE bs.status = status_filter AND (bs.is_edit_request = false OR bs.is_edit_request IS NULL)
    END
  ORDER BY bs.created_at DESC;
END;
$$;