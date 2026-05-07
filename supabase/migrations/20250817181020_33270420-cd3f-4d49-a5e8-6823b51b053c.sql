-- حذف الدالة الموجودة وإعادة إنشائها مع إضافة الحقول المفقودة
DROP FUNCTION IF EXISTS public.get_book_submissions_with_edit_info(text);

-- إنشاء دالة محدثة لجلب طلبات الكتب مع معلومات التعديل
CREATE OR REPLACE FUNCTION public.get_book_submissions_with_edit_info(status_filter text)
RETURNS TABLE(
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
  original_author text,
  original_description text,
  original_category text,
  original_language text,
  original_publication_year integer,
  original_page_count integer,
  original_display_type text,
  changes_summary jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
    COALESCE(bs.is_edit_request, false) as is_edit_request,
    bs.original_book_id,
    bs.edit_requested_at,
    -- جلب معلومات الكتاب الأصلي للمقارنة
    CASE 
      WHEN bs.is_edit_request = true AND bs.original_book_id IS NOT NULL THEN
        (SELECT ab.title FROM public.approved_books ab WHERE ab.id = bs.original_book_id)
      ELSE NULL
    END as original_title,
    CASE 
      WHEN bs.is_edit_request = true AND bs.original_book_id IS NOT NULL THEN
        (SELECT ab.author FROM public.approved_books ab WHERE ab.id = bs.original_book_id)
      ELSE NULL
    END as original_author,
    CASE 
      WHEN bs.is_edit_request = true AND bs.original_book_id IS NOT NULL THEN
        (SELECT ab.description FROM public.approved_books ab WHERE ab.id = bs.original_book_id)
      ELSE NULL
    END as original_description,
    CASE 
      WHEN bs.is_edit_request = true AND bs.original_book_id IS NOT NULL THEN
        (SELECT ab.category FROM public.approved_books ab WHERE ab.id = bs.original_book_id)
      ELSE NULL
    END as original_category,
    CASE 
      WHEN bs.is_edit_request = true AND bs.original_book_id IS NOT NULL THEN
        (SELECT ab.language FROM public.approved_books ab WHERE ab.id = bs.original_book_id)
      ELSE NULL
    END as original_language,
    CASE 
      WHEN bs.is_edit_request = true AND bs.original_book_id IS NOT NULL THEN
        (SELECT ab.publication_year FROM public.approved_books ab WHERE ab.id = bs.original_book_id)
      ELSE NULL
    END as original_publication_year,
    CASE 
      WHEN bs.is_edit_request = true AND bs.original_book_id IS NOT NULL THEN
        (SELECT ab.page_count FROM public.approved_books ab WHERE ab.id = bs.original_book_id)
      ELSE NULL
    END as original_page_count,
    CASE 
      WHEN bs.is_edit_request = true AND bs.original_book_id IS NOT NULL THEN
        (SELECT ab.display_type FROM public.approved_books ab WHERE ab.id = bs.original_book_id)
      ELSE NULL
    END as original_display_type,
    -- إنشاء ملخص التغييرات الشامل
    CASE 
      WHEN bs.is_edit_request = true AND bs.original_book_id IS NOT NULL THEN
        jsonb_build_object(
          'title_changed', COALESCE(bs.title != (SELECT ab.title FROM public.approved_books ab WHERE ab.id = bs.original_book_id), false),
          'author_changed', COALESCE(bs.author != (SELECT ab.author FROM public.approved_books ab WHERE ab.id = bs.original_book_id), false),
          'description_changed', COALESCE(bs.description != (SELECT ab.description FROM public.approved_books ab WHERE ab.id = bs.original_book_id), false),
          'category_changed', COALESCE(bs.category != (SELECT ab.category FROM public.approved_books ab WHERE ab.id = bs.original_book_id), false),
          'language_changed', COALESCE(bs.language != (SELECT ab.language FROM public.approved_books ab WHERE ab.id = bs.original_book_id), false),
          'publication_year_changed', COALESCE(bs.publication_year IS DISTINCT FROM (SELECT ab.publication_year FROM public.approved_books ab WHERE ab.id = bs.original_book_id), false),
          'page_count_changed', COALESCE(bs.page_count IS DISTINCT FROM (SELECT ab.page_count FROM public.approved_books ab WHERE ab.id = bs.original_book_id), false),
          'display_type_changed', COALESCE(bs.display_type != (SELECT ab.display_type FROM public.approved_books ab WHERE ab.id = bs.original_book_id), false),
          'cover_changed', COALESCE(bs.cover_image_url != (SELECT ab.cover_image_url FROM public.approved_books ab WHERE ab.id = bs.original_book_id), false),
          'file_changed', COALESCE(bs.book_file_url != (SELECT ab.book_file_url FROM public.approved_books ab WHERE ab.id = bs.original_book_id), false)
        )
      ELSE NULL
    END as changes_summary
  FROM public.book_submissions bs
  WHERE 
    CASE 
      WHEN status_filter = 'pending' THEN bs.status = 'pending' AND COALESCE(bs.is_edit_request, false) = false
      WHEN status_filter = 'pending_edit' THEN bs.status = 'pending_edit' AND bs.is_edit_request = true
      WHEN status_filter = 'rejected' THEN bs.status = 'rejected'
      ELSE bs.status = status_filter
    END
  ORDER BY bs.created_at DESC
  LIMIT 100;
END;
$function$