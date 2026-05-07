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
  p_subtitle text DEFAULT NULL,
  p_author text,
  p_author_bio text DEFAULT NULL,
  p_category text,
  p_description text,
  p_language text,
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
    rights_confirmation,
    author_country_code,
    author_country_name,
    author_website,
    author_social_facebook,
    author_social_instagram,
    author_social_twitter,
    author_social_linkedin,
    author_social_youtube,
    author_social_tiktok,
    author_social_whatsapp,
    book_file_type,
    file_type,
    file_size,
    file_metadata,
    device_type,
    upload_method,
    mobile_upload
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
    v_original_book.rights_confirmation,
    v_original_book.author_country_code,
    v_original_book.author_country_name,
    v_original_book.author_website,
    v_original_book.author_social_facebook,
    v_original_book.author_social_instagram,
    v_original_book.author_social_twitter,
    v_original_book.author_social_linkedin,
    v_original_book.author_social_youtube,
    v_original_book.author_social_tiktok,
    v_original_book.author_social_whatsapp,
    v_original_book.book_file_type,
    v_original_book.file_type,
    v_original_book.file_size,
    v_original_book.file_metadata,
    v_original_book.device_type,
    v_original_book.upload_method,
    v_original_book.mobile_upload
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

-- دالة للحصول على بيانات الكتب مع التمييز بين الطلبات العادية وطلبات التعديل
CREATE OR REPLACE FUNCTION public.get_book_submissions_data(status_filter text DEFAULT NULL)
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
    bs.is_edit_request,
    bs.original_book_id,
    bs.edit_requested_at,
    bs.original_views,
    bs.original_rating,
    CASE 
      WHEN bs.is_edit_request = true THEN 'تعديل كتاب معتمد'
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
    CASE WHEN bs.is_edit_request = true THEN bs.edit_requested_at ELSE bs.created_at END DESC;
END;
$$;