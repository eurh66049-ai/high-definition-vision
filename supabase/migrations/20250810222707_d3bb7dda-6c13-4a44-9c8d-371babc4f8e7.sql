-- إضافة أعمدة جديدة لتتبع التعديلات على الكتب المعتمدة
ALTER TABLE public.book_submissions 
ADD COLUMN IF NOT EXISTS is_edit_request boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS original_book_id uuid,
ADD COLUMN IF NOT EXISTS edit_requested_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS previous_status text,
ADD COLUMN IF NOT EXISTS original_views integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS original_rating numeric DEFAULT 0.0;

-- إنشاء فهرس للبحث السريع عن الكتب المعدلة
CREATE INDEX IF NOT EXISTS idx_book_submissions_edit_request ON public.book_submissions(is_edit_request, original_book_id);
CREATE INDEX IF NOT EXISTS idx_book_submissions_original_book ON public.book_submissions(original_book_id);

-- دالة لمعالجة طلبات تعديل الكتب المعتمدة
CREATE OR REPLACE FUNCTION public.handle_edit_approved_book(
  p_original_book_id uuid,
  p_user_id uuid,
  p_title text,
  p_author text,
  p_category text,
  p_description text,
  p_language text,
  p_subtitle text DEFAULT NULL,
  p_author_bio text DEFAULT NULL,
  p_display_type text DEFAULT 'download_read',
  p_publisher text DEFAULT NULL,
  p_translator text DEFAULT NULL,
  p_publication_year integer DEFAULT NULL,
  p_page_count integer DEFAULT NULL,
  p_cover_image_url text DEFAULT NULL,
  p_book_file_url text DEFAULT NULL,
  p_author_image_url text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_original_book RECORD;
  v_new_submission_id uuid;
BEGIN
  -- التحقق من وجود الكتاب الأصلي وأنه معتمد ويخص المستخدم
  SELECT * INTO v_original_book
  FROM public.book_submissions
  WHERE id = p_original_book_id 
    AND user_id = p_user_id 
    AND status = 'approved';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'الكتاب غير موجود أو غير معتمد أو لا يخصك';
  END IF;
  
  -- إنشاء طلب تعديل جديد بالبيانات المحدثة
  INSERT INTO public.book_submissions (
    user_id,
    title,
    subtitle,
    author,
    author_bio,
    category,
    description,
    language,
    display_type,
    publisher,
    translator,
    publication_year,
    page_count,
    cover_image_url,
    book_file_url,
    author_image_url,
    status,
    is_edit_request,
    original_book_id,
    edit_requested_at,
    previous_status,
    original_views,
    original_rating,
    user_email,
    rights_confirmation
  ) VALUES (
    p_user_id,
    p_title,
    p_subtitle,
    p_author,
    p_author_bio,
    p_category,
    p_description,
    p_language,
    p_display_type,
    p_publisher,
    p_translator,
    p_publication_year,
    p_page_count,
    COALESCE(p_cover_image_url, v_original_book.cover_image_url),
    COALESCE(p_book_file_url, v_original_book.book_file_url),
    COALESCE(p_author_image_url, v_original_book.author_image_url),
    'pending_edit', -- حالة خاصة للتعديلات
    true,
    p_original_book_id,
    NOW(),
    'approved',
    v_original_book.views,
    v_original_book.rating,
    v_original_book.user_email,
    v_original_book.rights_confirmation
  ) RETURNING id INTO v_new_submission_id;
  
  -- إرسال إشعار للمستخدم
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
    p_user_id,
    'تم إرسال طلب تعديل الكتاب! 📝',
    'تم إرسال طلب تعديل كتاب "' || p_title || '" للمراجعة. ستتلقى إشعاراً عند الانتهاء من المراجعة.',
    'info',
    v_new_submission_id,
    p_title,
    p_author,
    p_category,
    NOW()
  );
  
  RETURN v_new_submission_id;
END;
$$;