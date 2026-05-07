-- حذف الدالة الموجودة وإعادة إنشائها بالنوع الصحيح
DROP FUNCTION IF EXISTS public.permanently_delete_approved_book(UUID, TEXT);

-- دالة حذف الكتب المعتمدة نهائياً من جدول approved_books
CREATE OR REPLACE FUNCTION public.permanently_delete_approved_book(
  p_book_id UUID,
  p_reason TEXT
) 
RETURNS TABLE(
  success BOOLEAN,
  error TEXT,
  book_title TEXT,
  deleted_files INTEGER,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_book_record RECORD;
  v_deleted_files INTEGER := 0;
  book_cover_name TEXT;
  book_file_name TEXT;
  author_image_name TEXT;
BEGIN
  -- جلب بيانات الكتاب قبل الحذف
  SELECT * INTO v_book_record
  FROM public.approved_books 
  WHERE id = p_book_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'الكتاب غير موجود أو غير نشط', NULL::TEXT, 0, NULL::TEXT;
    RETURN;
  END IF;
  
  -- حفظ نسخة احتياطية قبل الحذف
  INSERT INTO public.deleted_files_backup (
    original_book_id,
    file_type,
    original_file_url,
    deletion_reason,
    deleted_at
  ) VALUES
  (p_book_id, 'approved_book', v_book_record.cover_image_url, p_reason, NOW()),
  (p_book_id, 'approved_book_file', v_book_record.book_file_url, p_reason, NOW()),
  (p_book_id, 'approved_author_image', v_book_record.author_image_url, p_reason, NOW());
  
  -- حذف الملفات من storage
  -- حذف صورة الغلاف
  IF v_book_record.cover_image_url IS NOT NULL THEN
    book_cover_name := split_part(v_book_record.cover_image_url, '/', -1);
    IF book_cover_name IS NOT NULL AND book_cover_name != '' THEN
      DELETE FROM storage.objects 
      WHERE bucket_id IN ('book-covers', 'book-files') 
      AND (name LIKE '%' || book_cover_name || '%' OR name = book_cover_name);
      v_deleted_files := v_deleted_files + 1;
    END IF;
  END IF;
  
  -- حذف ملف الكتاب
  IF v_book_record.book_file_url IS NOT NULL THEN
    book_file_name := split_part(v_book_record.book_file_url, '/', -1);
    IF book_file_name IS NOT NULL AND book_file_name != '' THEN
      DELETE FROM storage.objects 
      WHERE bucket_id IN ('book-covers', 'book-files') 
      AND (name LIKE '%' || book_file_name || '%' OR name = book_file_name);
      v_deleted_files := v_deleted_files + 1;
    END IF;
  END IF;
  
  -- حذف صورة المؤلف
  IF v_book_record.author_image_url IS NOT NULL THEN
    author_image_name := split_part(v_book_record.author_image_url, '/', -1);
    IF author_image_name IS NOT NULL AND author_image_name != '' THEN
      DELETE FROM storage.objects 
      WHERE bucket_id IN ('book-covers', 'book-files') 
      AND (name LIKE '%' || author_image_name || '%' OR name = author_image_name);
      v_deleted_files := v_deleted_files + 1;
    END IF;
  END IF;
  
  -- حذف البيانات المرتبطة
  DELETE FROM public.book_likes WHERE book_id = p_book_id;
  DELETE FROM public.book_reviews WHERE book_id = p_book_id;
  DELETE FROM public.book_stats WHERE book_id = p_book_id;
  DELETE FROM public.book_recommendations WHERE book_id = p_book_id::TEXT;
  
  -- حذف الكتاب من الجدول الرئيسي
  DELETE FROM public.approved_books WHERE id = p_book_id;
  
  RETURN QUERY SELECT 
    true,
    NULL::TEXT,
    v_book_record.title,
    v_deleted_files,
    'تم حذف الكتاب "' || v_book_record.title || '" نهائياً من النظام';
    
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT 
    false,
    'خطأ في عملية الحذف: ' || SQLERRM,
    v_book_record.title,
    0,
    NULL::TEXT;
END;
$$;