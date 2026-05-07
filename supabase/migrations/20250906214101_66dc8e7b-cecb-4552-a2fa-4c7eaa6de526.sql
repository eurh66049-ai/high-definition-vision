-- حذف الدالة الموجودة أولاً ثم إعادة إنشائها
DROP FUNCTION IF EXISTS public.unapprove_book_instead_of_delete(uuid, text);

-- إنشاء دالة لحذف الكتاب المعتمد فعلاً من جدول approved_books
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
  v_book_record approved_books%ROWTYPE;
  v_deleted_count INTEGER := 0;
BEGIN
  -- التحقق من وجود الكتاب
  SELECT * INTO v_book_record 
  FROM approved_books 
  WHERE id = p_book_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, null::TEXT, null::TEXT, 0, 'الكتاب غير موجود'::TEXT;
    RETURN;
  END IF;
  
  -- إنشاء سجل في جدول النسخ الاحتياطية للملفات المحذوفة
  INSERT INTO deleted_files_backup (
    original_book_id,
    file_type,
    original_file_url,
    deletion_reason,
    deleted_by
  ) VALUES 
  (p_book_id, 'book_file', v_book_record.book_file_url, p_reason, auth.uid()),
  (p_book_id, 'cover_image', v_book_record.cover_image_url, p_reason, auth.uid()),
  (p_book_id, 'author_image', v_book_record.author_image_url, p_reason, auth.uid());
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  -- حذف الكتاب من جدول approved_books
  DELETE FROM approved_books WHERE id = p_book_id;
  
  -- إرجاع النتيجة
  RETURN QUERY SELECT 
    true, 
    ('تم حذف الكتاب "' || v_book_record.title || '" من قائمة الكتب المعتمدة')::TEXT,
    v_book_record.title,
    v_deleted_count,
    null::TEXT;
    
  RETURN;
  
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT 
    false, 
    null::TEXT, 
    null::TEXT, 
    0, 
    ('خطأ في حذف الكتاب: ' || SQLERRM)::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;