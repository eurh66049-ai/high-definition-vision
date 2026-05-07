-- إنشاء الدالة المطلوبة لجلب طلبات الكتب مع معلومات التعديل
CREATE OR REPLACE FUNCTION public.get_book_submissions_with_edit_info(status_filter TEXT)
RETURNS TABLE(
  id UUID,
  title TEXT,
  subtitle TEXT,
  author TEXT,
  category TEXT,
  publisher TEXT,
  translator TEXT,
  description TEXT,
  language TEXT,
  publication_year INTEGER,
  page_count INTEGER,
  cover_image_url TEXT,
  book_file_url TEXT,
  file_type TEXT,
  display_type TEXT,
  rights_confirmation BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  status TEXT,
  user_id UUID,
  user_email TEXT,
  reviewer_notes TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  is_edit_request BOOLEAN,
  original_book_id UUID,
  edit_requested_at TIMESTAMP WITH TIME ZONE,
  original_title TEXT,
  original_author TEXT,
  original_description TEXT,
  original_category TEXT,
  original_language TEXT,
  original_publication_year INTEGER,
  original_page_count INTEGER,
  original_display_type TEXT,
  changes_summary JSONB
) AS $$
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
    -- البيانات الأصلية من الكتاب المعتمد
    ab.title as original_title,
    ab.author as original_author,
    ab.description as original_description,
    ab.category as original_category,
    ab.language as original_language,
    ab.publication_year as original_publication_year,
    ab.page_count as original_page_count,
    ab.display_type as original_display_type,
    -- ملخص التغييرات
    CASE 
      WHEN bs.is_edit_request = true AND ab.id IS NOT NULL THEN
        jsonb_build_object(
          'title_changed', (bs.title IS DISTINCT FROM ab.title),
          'author_changed', (bs.author IS DISTINCT FROM ab.author),
          'description_changed', (bs.description IS DISTINCT FROM ab.description),
          'category_changed', (bs.category IS DISTINCT FROM ab.category),
          'language_changed', (bs.language IS DISTINCT FROM ab.language),
          'publication_year_changed', (bs.publication_year IS DISTINCT FROM ab.publication_year),
          'page_count_changed', (bs.page_count IS DISTINCT FROM ab.page_count),
          'display_type_changed', (bs.display_type IS DISTINCT FROM ab.display_type),
          'cover_changed', (bs.cover_image_url IS DISTINCT FROM ab.cover_image_url),
          'file_changed', (bs.book_file_url IS DISTINCT FROM ab.book_file_url)
        )
      ELSE '{}'::jsonb
    END as changes_summary
  FROM public.book_submissions bs
  LEFT JOIN public.approved_books ab ON bs.original_book_id = ab.id
  WHERE 
    CASE 
      WHEN status_filter = 'pending' THEN bs.status = 'pending' AND bs.is_edit_request = false
      WHEN status_filter = 'pending_edit' THEN bs.status = 'pending_edit' AND bs.is_edit_request = true
      WHEN status_filter = 'rejected' THEN bs.status = 'rejected'
      WHEN status_filter = 'approved' THEN bs.status = 'approved'
      ELSE bs.status = status_filter
    END
  ORDER BY bs.created_at DESC
  LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;