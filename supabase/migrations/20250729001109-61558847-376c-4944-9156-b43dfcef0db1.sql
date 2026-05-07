-- تحديث دالة حذف الكتب المرفوضة لحذف الملفات فعلياً من التخزين
CREATE OR REPLACE FUNCTION public.safe_cleanup_rejected_book_files()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cover_filename TEXT;
  book_filename TEXT;
  author_filename TEXT;
BEGIN
  -- فقط إذا تم تغيير الحالة إلى rejected
  IF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
    
    -- تسجيل الملفات في backup قبل الحذف
    IF NEW.cover_image_url IS NOT NULL AND NEW.cover_image_url != '' THEN
      INSERT INTO public.deleted_files_backup (
        original_book_id, original_file_url, file_type, deletion_reason, deleted_by
      ) VALUES (
        NEW.id, NEW.cover_image_url, 'cover', 'Book rejected', auth.uid()
      );
    END IF;
    
    IF NEW.book_file_url IS NOT NULL AND NEW.book_file_url != '' THEN
      INSERT INTO public.deleted_files_backup (
        original_book_id, original_file_url, file_type, deletion_reason, deleted_by
      ) VALUES (
        NEW.id, NEW.book_file_url, 'pdf', 'Book rejected', auth.uid()
      );
    END IF;
    
    IF NEW.author_image_url IS NOT NULL AND NEW.author_image_url != '' THEN
      INSERT INTO public.deleted_files_backup (
        original_book_id, original_file_url, file_type, deletion_reason, deleted_by
      ) VALUES (
        NEW.id, NEW.author_image_url, 'author_image', 'Book rejected', auth.uid()
      );
    END IF;
    
    -- الآن نحذف الملفات فعلياً من التخزين
    
    -- حذف صورة الغلاف
    IF NEW.cover_image_url IS NOT NULL AND NEW.cover_image_url != '' THEN
      cover_filename := split_part(NEW.cover_image_url, '/', -1);
      
      IF cover_filename IS NOT NULL AND cover_filename != '' THEN
        -- محاولة حذف من buckets مختلفة
        DELETE FROM storage.objects 
        WHERE bucket_id IN ('book-covers', 'book-files', 'public')
        AND (name = cover_filename OR name LIKE '%' || cover_filename);
        
        -- محاولة حذف من مجلد covers
        DELETE FROM storage.objects 
        WHERE bucket_id IN ('book-covers', 'book-files')
        AND name LIKE 'covers/%' || cover_filename;
      END IF;
    END IF;
    
    -- حذف ملف الكتاب PDF
    IF NEW.book_file_url IS NOT NULL AND NEW.book_file_url != '' THEN
      book_filename := split_part(NEW.book_file_url, '/', -1);
      
      IF book_filename IS NOT NULL AND book_filename != '' THEN
        -- محاولة حذف من buckets مختلفة
        DELETE FROM storage.objects 
        WHERE bucket_id IN ('book-files', 'book-covers', 'public')
        AND (name = book_filename OR name LIKE '%' || book_filename);
        
        -- محاولة حذف من مجلد pdfs
        DELETE FROM storage.objects 
        WHERE bucket_id IN ('book-files', 'book-covers')
        AND name LIKE 'pdfs/%' || book_filename;
      END IF;
    END IF;
    
    -- حذف صورة المؤلف
    IF NEW.author_image_url IS NOT NULL AND NEW.author_image_url != '' THEN
      author_filename := split_part(NEW.author_image_url, '/', -1);
      
      IF author_filename IS NOT NULL AND author_filename != '' THEN
        DELETE FROM storage.objects 
        WHERE bucket_id IN ('book-covers', 'book-files', 'public', 'author-images')
        AND (name = author_filename OR name LIKE '%' || author_filename);
        
        -- محاولة حذف من مجلد authors
        DELETE FROM storage.objects 
        WHERE bucket_id IN ('book-covers', 'book-files', 'author-images')
        AND name LIKE 'authors/%' || author_filename;
      END IF;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$;