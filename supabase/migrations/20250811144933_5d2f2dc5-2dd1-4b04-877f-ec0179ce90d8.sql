-- إنشاء دالة لحذف الكتب المعتمدة نهائياً (للمؤلفين)
CREATE OR REPLACE FUNCTION public.delete_approved_book_permanently(
  p_book_id UUID,
  p_user_id UUID
) RETURNS TABLE(
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
  -- جلب بيانات الكتاب المعتمد مع التحقق من الملكية
  SELECT * INTO v_book_record
  FROM public.book_submissions 
  WHERE id = p_book_id 
    AND user_id = p_user_id 
    AND status = 'approved';
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'لم يتم العثور على الكتاب أو ليس لديك صلاحية لحذفه', ''::TEXT, 0;
    RETURN;
  END IF;
  
  -- نسخ احتياطية من بيانات الملفات قبل الحذف
  INSERT INTO public.deleted_files_backup (
    original_book_id,
    file_type,
    original_file_url,
    deletion_reason,
    deleted_by
  ) VALUES 
  (p_book_id, 'cover', v_book_record.cover_image_url, 'حذف بواسطة المؤلف', p_user_id),
  (p_book_id, 'book_file', v_book_record.book_file_url, 'حذف بواسطة المؤلف', p_user_id),
  (p_book_id, 'author_image', v_book_record.author_image_url, 'حذف بواسطة المؤلف', p_user_id);
  
  -- حذف الملفات من storage
  IF v_book_record.cover_image_url IS NOT NULL THEN
    -- سيتم حذف الملفات من storage بواسطة trigger منفصل
    v_deleted_files := v_deleted_files + 1;
  END IF;
  
  IF v_book_record.book_file_url IS NOT NULL THEN
    v_deleted_files := v_deleted_files + 1;
  END IF;
  
  IF v_book_record.author_image_url IS NOT NULL THEN
    v_deleted_files := v_deleted_files + 1;
  END IF;
  
  -- حذف البيانات المرتبطة
  DELETE FROM public.book_likes WHERE book_id = p_book_id;
  DELETE FROM public.book_reviews WHERE book_id = p_book_id;
  DELETE FROM public.quotes WHERE book_id = p_book_id;
  DELETE FROM public.book_stats WHERE book_id = p_book_id;
  DELETE FROM public.reading_progress WHERE book_id = p_book_id::text;
  
  -- حذف الكتاب نهائياً من book_submissions
  DELETE FROM public.book_submissions WHERE id = p_book_id;
  
  -- حذف من approved_books إذا كان موجوداً
  DELETE FROM public.approved_books WHERE id = p_book_id;
  
  -- إرسال إشعار للمؤلف بالتأكيد
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
    'تم حذف كتابك نهائياً 🗑️',
    'تم حذف كتاب "' || v_book_record.title || '" نهائياً من المكتبة بناءً على طلبك.',
    'info',
    p_book_id,
    v_book_record.title,
    v_book_record.author,
    v_book_record.category,
    NOW()
  );
  
  RETURN QUERY SELECT 
    TRUE,
    'تم حذف الكتاب نهائياً من المكتبة',
    v_book_record.title,
    v_deleted_files;
END;
$$;