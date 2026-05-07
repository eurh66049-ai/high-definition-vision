-- Fix the unapprove book function to work with the base table instead of view
DROP FUNCTION IF EXISTS unapprove_book_instead_of_delete(UUID, TEXT);

-- Create a proper function that works with the base table
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
    rejection_reason = p_reason,
    updated_at = now()
  WHERE id = p_book_id;
  
  -- Log the action
  INSERT INTO admin_actions (
    admin_email,
    action_type,
    book_id,
    details,
    created_at
  ) VALUES (
    current_setting('request.jwt.claims', true)::json->>'email',
    'unapprove_book',
    p_book_id,
    jsonb_build_object(
      'reason', p_reason,
      'book_title', v_book_title,
      'action', 'Book unapproved and moved back to pending'
    ),
    now()
  );
  
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