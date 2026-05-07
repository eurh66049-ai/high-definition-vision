-- تحديث دالة إلغاء الموافقة للتعامل مع book_submissions بدلاً من approved_books view
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
  -- البحث عن الكتاب في book_submissions بحالة approved
  SELECT * INTO v_book_record
  FROM public.book_submissions 
  WHERE id = p_book_id AND status = 'approved';
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TEXT, 0, 'الكتاب غير موجود'::TEXT;
    RETURN;
  END IF;
  
  -- تحويل حالة الكتاب من approved إلى rejected
  UPDATE public.book_submissions 
  SET 
    status = 'rejected',
    reviewer_notes = 'تم إلغاء الموافقة: ' || p_reason,
    reviewed_at = NOW(),
    previous_status = 'approved'
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