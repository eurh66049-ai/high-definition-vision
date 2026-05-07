-- حذف الدالة الموجودة
DROP FUNCTION IF EXISTS public.get_book_submissions_data(text);

-- دالة لمعالجة الموافقة على تعديلات الكتب
CREATE OR REPLACE FUNCTION public.approve_book_edit(
  p_edit_submission_id uuid,
  p_reviewer_notes text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_edit_submission RECORD;
  v_original_book RECORD;
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
  
  -- جلب بيانات الكتاب الأصلي
  SELECT * INTO v_original_book
  FROM public.book_submissions
  WHERE id = v_edit_submission.original_book_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'الكتاب الأصلي غير موجود';
  END IF;
  
  -- تحديث الكتاب الأصلي بالبيانات الجديدة مع الحفاظ على المشاهدات والتقييم
  UPDATE public.book_submissions SET
    title = v_edit_submission.title,
    subtitle = v_edit_submission.subtitle,
    author = v_edit_submission.author,
    author_bio = v_edit_submission.author_bio,
    category = v_edit_submission.category,
    description = v_edit_submission.description,
    language = v_edit_submission.language,
    display_type = v_edit_submission.display_type,
    publisher = v_edit_submission.publisher,
    translator = v_edit_submission.translator,
    publication_year = v_edit_submission.publication_year,
    page_count = v_edit_submission.page_count,
    cover_image_url = COALESCE(v_edit_submission.cover_image_url, v_original_book.cover_image_url),
    book_file_url = COALESCE(v_edit_submission.book_file_url, v_original_book.book_file_url),
    author_image_url = COALESCE(v_edit_submission.author_image_url, v_original_book.author_image_url),
    reviewed_at = NOW(),
    reviewer_notes = p_reviewer_notes,
    -- الحفاظ على البيانات المهمة
    views = v_original_book.views, -- الحفاظ على المشاهدات
    rating = v_original_book.rating, -- الحفاظ على التقييم
    status = 'approved' -- إعادة الحالة إلى معتمد
  WHERE id = v_edit_submission.original_book_id;
  
  -- حذف طلب التعديل بعد التطبيق
  DELETE FROM public.book_submissions WHERE id = p_edit_submission_id;
  
  -- إرسال إشعار بالموافقة على التعديل
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
    v_edit_submission.original_book_id,
    v_edit_submission.title,
    v_edit_submission.author,
    v_edit_submission.category,
    NOW()
  );
  
  RETURN true;
END;
$$;

-- إنشاء دالة جديدة للحصول على بيانات الكتب مع معلومات التعديل
CREATE OR REPLACE FUNCTION public.get_book_submissions_with_edit_info(status_filter text DEFAULT NULL)
RETURNS TABLE(
  id uuid,
  title text,
  author text,
  category text,
  description text,
  status text,
  created_at timestamp with time zone,
  reviewed_at timestamp with time zone,
  reviewer_notes text,
  cover_image_url text,
  book_file_url text,
  author_image_url text,
  user_email text,
  user_id uuid,
  is_edit_request boolean,
  original_book_id uuid,
  edit_requested_at timestamp with time zone,
  original_views integer,
  original_rating numeric,
  submission_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bs.id,
    bs.title,
    bs.author,
    bs.category,
    bs.description,
    bs.status,
    bs.created_at,
    bs.reviewed_at,
    bs.reviewer_notes,
    bs.cover_image_url,
    bs.book_file_url,
    bs.author_image_url,
    bs.user_email,
    bs.user_id,
    COALESCE(bs.is_edit_request, false) as is_edit_request,
    bs.original_book_id,
    bs.edit_requested_at,
    COALESCE(bs.original_views, 0) as original_views,
    COALESCE(bs.original_rating, 0.0) as original_rating,
    CASE 
      WHEN COALESCE(bs.is_edit_request, false) = true THEN 'تعديل كتاب معتمد'
      ELSE 'كتاب جديد'
    END as submission_type
  FROM public.book_submissions bs
  WHERE 
    (status_filter IS NULL OR bs.status = status_filter)
    AND (
      bs.status IN ('pending', 'pending_edit') OR 
      (status_filter IS NOT NULL AND bs.status = status_filter)
    )
  ORDER BY 
    CASE WHEN COALESCE(bs.is_edit_request, false) = true THEN bs.edit_requested_at ELSE bs.created_at END DESC;
END;
$$;