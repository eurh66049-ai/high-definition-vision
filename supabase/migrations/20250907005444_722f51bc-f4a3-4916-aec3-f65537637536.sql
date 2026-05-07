-- إنشاء دالة لحذف الكتاب نهائياً من approved_books
CREATE OR REPLACE FUNCTION public.permanently_delete_approved_book(
  p_book_id UUID,
  p_reason TEXT DEFAULT 'حذف نهائي بواسطة المدير'
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  book_title TEXT,
  deleted_files INTEGER,
  error TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_book_record RECORD;
  v_deleted_files INTEGER := 0;
  v_cover_filename TEXT;
  v_book_filename TEXT;
  v_author_filename TEXT;
BEGIN
  -- التحقق من وجود الكتاب
  SELECT * INTO v_book_record
  FROM public.approved_books
  WHERE id = p_book_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      false as success, 
      'الكتاب غير موجود أو غير نشط' as message,
      '' as book_title,
      0 as deleted_files,
      'book_not_found' as error;
    RETURN;
  END IF;
  
  -- تسجيل الحذف في جدول deleted_files_backup
  INSERT INTO public.deleted_files_backup (
    original_book_id,
    file_type,
    original_file_url,
    deleted_by,
    deletion_reason,
    deleted_at
  ) VALUES 
  (p_book_id, 'cover', v_book_record.cover_image_url, auth.uid(), p_reason, NOW()),
  (p_book_id, 'book_file', v_book_record.book_file_url, auth.uid(), p_reason, NOW()),
  (p_book_id, 'author_image', v_book_record.author_image_url, auth.uid(), p_reason, NOW());
  
  -- حذف صورة الغلاف من storage
  IF v_book_record.cover_image_url IS NOT NULL AND v_book_record.cover_image_url != '' THEN
    v_cover_filename := split_part(v_book_record.cover_image_url, '/', -1);
    
    -- حذف من buckets مختلفة
    DELETE FROM storage.objects WHERE bucket_id = 'book-covers' AND name = v_cover_filename;
    DELETE FROM storage.objects WHERE bucket_id = 'book-covers' AND name LIKE 'covers/%' || v_cover_filename;
    DELETE FROM storage.objects WHERE bucket_id = 'book-files' AND name = v_cover_filename;
    DELETE FROM storage.objects WHERE bucket_id = 'book-files' AND name LIKE 'covers/%' || v_cover_filename;
    
    v_deleted_files := v_deleted_files + 1;
  END IF;
  
  -- حذف ملف الكتاب من storage
  IF v_book_record.book_file_url IS NOT NULL AND v_book_record.book_file_url != '' THEN
    v_book_filename := split_part(v_book_record.book_file_url, '/', -1);
    
    -- حذف من buckets مختلفة
    DELETE FROM storage.objects WHERE bucket_id = 'book-files' AND name = v_book_filename;
    DELETE FROM storage.objects WHERE bucket_id = 'book-files' AND name LIKE 'books/%' || v_book_filename;
    DELETE FROM storage.objects WHERE bucket_id = 'book-files' AND name LIKE 'pdfs/%' || v_book_filename;
    DELETE FROM storage.objects WHERE bucket_id = 'book-covers' AND name = v_book_filename;
    
    v_deleted_files := v_deleted_files + 1;
  END IF;
  
  -- حذف صورة المؤلف من storage
  IF v_book_record.author_image_url IS NOT NULL AND v_book_record.author_image_url != '' THEN
    v_author_filename := split_part(v_book_record.author_image_url, '/', -1);
    
    -- حذف من buckets مختلفة
    DELETE FROM storage.objects WHERE bucket_id = 'book-covers' AND name = v_author_filename;
    DELETE FROM storage.objects WHERE bucket_id = 'book-covers' AND name LIKE 'authors/%' || v_author_filename;
    DELETE FROM storage.objects WHERE bucket_id = 'book-files' AND name = v_author_filename;
    DELETE FROM storage.objects WHERE bucket_id = 'book-files' AND name LIKE 'authors/%' || v_author_filename;
    
    v_deleted_files := v_deleted_files + 1;
  END IF;
  
  -- حذف البيانات المرتبطة
  -- حذف book_likes
  DELETE FROM public.book_likes WHERE book_id = p_book_id;
  
  -- حذف book_reviews
  DELETE FROM public.book_reviews WHERE book_id = p_book_id;
  
  -- حذف book_recommendations
  DELETE FROM public.book_recommendations WHERE book_id = p_book_id::text;
  
  -- حذف book_stats
  DELETE FROM public.book_stats WHERE book_id = p_book_id;
  
  -- حذف book_media
  DELETE FROM public.book_media WHERE book_id = p_book_id AND book_table = 'approved_books';
  
  -- حذف الإشعارات المرتبطة
  DELETE FROM public.notifications WHERE book_submission_id = p_book_id;
  
  -- حذف من dynamic_sitemap
  DELETE FROM public.dynamic_sitemap WHERE entity_id = p_book_id;
  
  -- حذف الكتاب نهائياً من approved_books
  DELETE FROM public.approved_books WHERE id = p_book_id;
  
  -- إرجاع النتيجة
  RETURN QUERY SELECT 
    true as success,
    'تم حذف الكتاب "' || v_book_record.title || '" نهائياً من المكتبة' as message,
    v_book_record.title as book_title,
    v_deleted_files as deleted_files,
    null::text as error;
    
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT 
    false as success,
    'خطأ في حذف الكتاب: ' || SQLERRM as message,
    COALESCE(v_book_record.title, '') as book_title,
    0 as deleted_files,
    SQLERRM as error;
END;
$$;