-- إنشاء دالة إلغاء الموافقة على الكتب بدلاً من حذفها نهائياً
CREATE OR REPLACE FUNCTION public.unapprove_book_instead_of_delete(
  p_book_id UUID,
  p_reason TEXT
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  book_title TEXT,
  deleted_files INTEGER,
  error TEXT
) AS $$
DECLARE
  v_book_record RECORD;
  v_deleted_files INTEGER := 0;
  v_message TEXT;
BEGIN
  -- البحث عن الكتاب في approved_books
  SELECT * INTO v_book_record
  FROM public.approved_books 
  WHERE id = p_book_id AND is_active = true;
  
  IF NOT FOUND THEN
    -- إذا لم يوجد في approved_books، ابحث في book_submissions
    SELECT * INTO v_book_record
    FROM public.book_submissions 
    WHERE id = p_book_id AND status = 'approved';
    
    IF NOT FOUND THEN
      RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TEXT, 0, 'الكتاب غير موجود'::TEXT;
      RETURN;
    END IF;
    
    -- نقل الكتاب من approved إلى rejected في book_submissions
    UPDATE public.book_submissions 
    SET 
      status = 'rejected',
      reviewer_notes = 'تم إلغاء الموافقة: ' || p_reason,
      reviewed_at = NOW()
    WHERE id = p_book_id;
    
  ELSE
    -- إذا وجد في approved_books، قم بإلغاء تفعيله
    UPDATE public.approved_books 
    SET is_active = false
    WHERE id = p_book_id;
    
    -- إضافة سجل في deleted_files_backup
    INSERT INTO public.deleted_files_backup (
      original_book_id,
      deleted_by,
      deletion_reason,
      file_type,
      original_file_url
    ) VALUES 
    (p_book_id, auth.uid(), p_reason, 'cover', v_book_record.cover_image_url),
    (p_book_id, auth.uid(), p_reason, 'book', v_book_record.book_file_url),
    (p_book_id, auth.uid(), p_reason, 'author_image', v_book_record.author_image_url);
    
    v_deleted_files := 3;
  END IF;
  
  -- إنشاء رسالة النجاح
  v_message := 'تم حذف الكتاب "' || v_book_record.title || '" من قائمة الكتب المعتمدة';
  
  -- إرسال إشعار للمستخدم صاحب الكتاب
  IF v_book_record.user_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      book_submission_id,
      book_title,
      created_at
    ) VALUES (
      v_book_record.user_id,
      'تم إلغاء الموافقة على كتابك',
      'تم إلغاء الموافقة على كتاب "' || v_book_record.title || '". السبب: ' || p_reason,
      'error',
      p_book_id,
      v_book_record.title,
      NOW()
    );
  END IF;
  
  RETURN QUERY SELECT TRUE, v_message, v_book_record.title, v_deleted_files, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;