-- إنشاء أو استبدال دالة معالجة الموافقة على تعديلات الكتب
CREATE OR REPLACE FUNCTION public.approve_book_edit(
  p_edit_submission_id uuid,
  p_reviewer_notes text DEFAULT NULL
) RETURNS boolean
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
    RAISE EXCEPTION 'طلب التعديل غير موجود أو غير قابل للمعالجة';
  END IF;
  
  -- جلب بيانات الكتاب الأصلي
  SELECT * INTO v_original_book
  FROM public.book_submissions
  WHERE id = v_edit_submission.original_book_id 
    AND status = 'approved';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'الكتاب الأصلي غير موجود';
  END IF;
  
  -- تحديث الكتاب الأصلي بالبيانات الجديدة
  UPDATE public.book_submissions
  SET 
    title = v_edit_submission.title,
    subtitle = v_edit_submission.subtitle,
    author = v_edit_submission.author,
    description = v_edit_submission.description,
    category = v_edit_submission.category,
    language = v_edit_submission.language,
    publisher = v_edit_submission.publisher,
    translator = v_edit_submission.translator,
    publication_year = v_edit_submission.publication_year,
    page_count = v_edit_submission.page_count,
    cover_image_url = COALESCE(v_edit_submission.cover_image_url, cover_image_url),
    book_file_url = COALESCE(v_edit_submission.book_file_url, book_file_url),
    author_bio = v_edit_submission.author_bio,
    author_image_url = COALESCE(v_edit_submission.author_image_url, author_image_url),
    author_website = v_edit_submission.author_website,
    author_social_facebook = v_edit_submission.author_social_facebook,
    author_social_twitter = v_edit_submission.author_social_twitter,
    author_social_instagram = v_edit_submission.author_social_instagram,
    author_social_linkedin = v_edit_submission.author_social_linkedin,
    author_social_youtube = v_edit_submission.author_social_youtube,
    author_social_tiktok = v_edit_submission.author_social_tiktok,
    author_social_whatsapp = v_edit_submission.author_social_whatsapp,
    author_country_code = v_edit_submission.author_country_code,
    author_country_name = v_edit_submission.author_country_name,
    display_type = v_edit_submission.display_type,
    rights_confirmation = v_edit_submission.rights_confirmation,
    reviewed_at = NOW(),
    reviewer_notes = p_reviewer_notes
  WHERE id = v_edit_submission.original_book_id;
  
  -- حذف طلب التعديل
  DELETE FROM public.book_submissions
  WHERE id = p_edit_submission_id;
  
  -- إرسال إشعار الموافقة
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
    'تمت الموافقة على تعديلات الكتاب! ✅',
    'تم قبول تعديلات كتاب "' || v_edit_submission.title || '" وتم تطبيقها بنجاح.',
    'success',
    v_edit_submission.original_book_id,
    v_edit_submission.title,
    v_edit_submission.author,
    v_edit_submission.category,
    NOW()
  );
  
  RETURN TRUE;
  
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'خطأ في معالجة الموافقة على التعديل: %', SQLERRM;
END;
$$;