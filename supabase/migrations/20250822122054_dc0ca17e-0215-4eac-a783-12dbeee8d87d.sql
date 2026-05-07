-- Fix the unapprove book function to use existing reviewer_notes column
DROP FUNCTION IF EXISTS unapprove_book_instead_of_delete(UUID, TEXT);

-- Create a proper function that works with existing columns
CREATE OR REPLACE FUNCTION unapprove_book_instead_of_delete(
  p_book_id UUID,
  p_reason TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_book_title TEXT;
  v_book_record RECORD;
  v_deleted_files INTEGER := 0;
BEGIN
  -- Get book information from book_submissions table
  SELECT title, status INTO v_book_record
  FROM book_submissions 
  WHERE id = p_book_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'الكتاب غير موجود'
    );
  END IF;
  
  -- Check if book is approved
  IF v_book_record.status != 'approved' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'الكتاب غير معتمد أصلاً'
    );
  END IF;
  
  v_book_title := v_book_record.title;
  
  -- Update the book status back to pending instead of deleting
  UPDATE book_submissions 
  SET 
    status = 'pending',
    reviewer_notes = p_reason,
    reviewed_at = now()
  WHERE id = p_book_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'تم إلغاء الموافقة بنجاح وإعادة الكتاب لقائمة الانتظار',
    'book_title', v_book_title,
    'deleted_files', v_deleted_files
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'حدث خطأ أثناء إلغاء الموافقة: ' || SQLERRM
    );
END;
$$;