-- إنشاء دالة محسنة للتعامل مع "إلغاء الموافقة" بدلاً من الحذف النهائي
CREATE OR REPLACE FUNCTION public.unapprove_book_instead_of_delete(
  p_book_id UUID,
  p_reason TEXT
) 
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  book_title TEXT,
  deleted_files INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_book_record RECORD;
  v_deleted_files INTEGER := 0;
BEGIN
  -- جلب بيانات الكتاب من approved_books
  SELECT * INTO v_book_record
  FROM public.approved_books 
  WHERE id = p_book_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'لم يتم العثور على الكتاب المعتمد', ''::TEXT, 0;
    RETURN;
  END IF;
  
  -- نقل الكتاب إلى book_submissions مع حالة pending (بدلاً من حذف الملفات)
  INSERT INTO public.book_submissions (
    id,
    user_id,
    title,
    subtitle,
    author,
    category,
    description,
    language,
    publisher,
    translator,
    publication_year,
    page_count,
    cover_image_url,
    book_file_url,
    author_image_url,
    author_bio,
    display_type,
    rights_confirmation,
    file_type,
    file_size,
    file_metadata,
    status,
    reviewer_notes,
    created_at,
    reviewed_at,
    user_email,
    rating,
    views,
    slug,
    processing_status
  ) VALUES (
    v_book_record.id,
    v_book_record.user_id,
    v_book_record.title,
    v_book_record.subtitle,
    v_book_record.author,
    v_book_record.category,
    v_book_record.description,
    v_book_record.language,
    v_book_record.publisher,
    v_book_record.translator,
    v_book_record.publication_year,
    v_book_record.page_count,
    v_book_record.cover_image_url,
    v_book_record.book_file_url,
    v_book_record.author_image_url,
    v_book_record.author_bio,
    v_book_record.display_type,
    v_book_record.rights_confirmation,
    v_book_record.file_type,
    v_book_record.file_size,
    v_book_record.file_metadata,
    'pending', -- إعادة إلى pending بدلاً من حذف نهائي
    p_reason, -- سبب إلغاء الموافقة
    v_book_record.created_at,
    NOW(), -- تحديث وقت المراجعة
    v_book_record.user_email,
    v_book_record.rating,
    v_book_record.views,
    v_book_record.slug,
    v_book_record.processing_status
  )
  ON CONFLICT (id) DO UPDATE SET
    status = 'pending',
    reviewer_notes = p_reason,
    reviewed_at = NOW();
  
  -- حذف من approved_books (لكن الاحتفاظ بالملفات)
  DELETE FROM public.approved_books WHERE id = p_book_id;
  
  -- إرسال إشعار للمستخدم بأنه تم إلغاء الموافقة
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
    v_book_record.user_id,
    'تم إلغاء الموافقة على كتابك 📋',
    'تم إلغاء الموافقة على كتاب "' || v_book_record.title || '" وإعادته للمراجعة. السبب: ' || p_reason,
    'warning',
    v_book_record.id,
    v_book_record.title,
    v_book_record.author,
    v_book_record.category,
    NOW()
  );
  
  RETURN QUERY SELECT 
    TRUE,
    'تم إلغاء الموافقة على الكتاب وإعادته للمراجعة (مع الاحتفاظ بالملفات)',
    v_book_record.title,
    v_deleted_files;
END;
$$;