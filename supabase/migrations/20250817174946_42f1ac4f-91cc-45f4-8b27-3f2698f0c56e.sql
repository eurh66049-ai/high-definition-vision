-- إنشاء دالة لجلب طلبات الكتب مع معلومات التعديل
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
  original_author text
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
$function$

-- إنشاء دالة للموافقة على تعديل الكتاب
CREATE OR REPLACE FUNCTION public.approve_book_edit(
  p_edit_submission_id uuid,
  p_reviewer_notes text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_edit_submission RECORD;
  v_original_book_id uuid;
BEGIN
  -- جلب بيانات طلب التعديل
  SELECT * INTO v_edit_submission
  FROM public.book_submissions 
  WHERE id = p_edit_submission_id 
    AND is_edit_request = true 
    AND status = 'pending_edit';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'طلب التعديل غير موجود أو غير صالح';
  END IF;

  v_original_book_id := v_edit_submission.original_book_id;
  
  IF v_original_book_id IS NULL THEN
    RAISE EXCEPTION 'معرف الكتاب الأصلي غير موجود';
  END IF;

  -- تحديث الكتاب الأصلي بالبيانات المُعدّلة
  UPDATE public.book_submissions
  SET 
    title = v_edit_submission.title,
    subtitle = v_edit_submission.subtitle,
    author = v_edit_submission.author,
    category = v_edit_submission.category,
    publisher = v_edit_submission.publisher,
    translator = v_edit_submission.translator,
    description = v_edit_submission.description,
    language = v_edit_submission.language,
    publication_year = v_edit_submission.publication_year,
    page_count = v_edit_submission.page_count,
    cover_image_url = COALESCE(v_edit_submission.cover_image_url, cover_image_url),
    book_file_url = COALESCE(v_edit_submission.book_file_url, book_file_url),
    file_type = COALESCE(v_edit_submission.file_type, file_type),
    display_type = v_edit_submission.display_type,
    rights_confirmation = v_edit_submission.rights_confirmation,
    reviewer_notes = p_reviewer_notes,
    reviewed_at = NOW()
  WHERE id = v_original_book_id;

  -- حذف طلب التعديل بعد تطبيقه
  DELETE FROM public.book_submissions 
  WHERE id = p_edit_submission_id;

  -- إرسال إشعار قبول التعديل
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    book_submission_id,
    book_title,
    book_author,
    book_category,
    created_at
  ) VALUES (
    v_edit_submission.user_id,
    'تم قبول تعديلات الكتاب! ✅',
    'تم قبول تعديلات كتاب "' || v_edit_submission.title || '" وتطبيقها بنجاح.',
    'success',
    v_original_book_id,
    v_edit_submission.title,
    v_edit_submission.author,
    v_edit_submission.category,
    NOW()
  );

  RETURN TRUE;
END;
$function$