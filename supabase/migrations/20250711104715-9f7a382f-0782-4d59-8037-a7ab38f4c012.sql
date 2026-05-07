-- إنشاء دالة لحذف ملفات الكتاب المرفوض من Storage
CREATE OR REPLACE FUNCTION public.cleanup_rejected_book_files()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cover_path TEXT;
  book_path TEXT;
  bucket_name TEXT;
BEGIN
  -- فقط إذا تم تغيير الحالة إلى rejected
  IF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
    
    -- حذف صورة الغلاف
    IF NEW.cover_image_url IS NOT NULL AND NEW.cover_image_url != '' THEN
      -- استخراج مسار الملف من الرابط
      cover_path := substring(NEW.cover_image_url from '/storage/v1/object/public/([^/]+)/(.+)$');
      
      IF cover_path IS NOT NULL THEN
        -- محاولة حذف من مجلدات مختلفة
        DELETE FROM storage.objects 
        WHERE bucket_id = 'book-covers' 
        AND (name = cover_path OR name LIKE '%' || split_part(cover_path, '/', -1));
        
        DELETE FROM storage.objects 
        WHERE bucket_id = 'book-files' 
        AND (name = cover_path OR name LIKE '%' || split_part(cover_path, '/', -1));
        
        -- محاولة حذف من bucket عام
        DELETE FROM storage.objects 
        WHERE bucket_id = 'public' 
        AND (name = cover_path OR name LIKE '%' || split_part(cover_path, '/', -1));
      END IF;
    END IF;
    
    -- حذف ملف الكتاب PDF
    IF NEW.book_file_url IS NOT NULL AND NEW.book_file_url != '' THEN
      -- استخراج مسار الملف من الرابط
      book_path := substring(NEW.book_file_url from '/storage/v1/object/public/([^/]+)/(.+)$');
      
      IF book_path IS NOT NULL THEN
        -- محاولة حذف من مجلدات مختلفة
        DELETE FROM storage.objects 
        WHERE bucket_id = 'book-files' 
        AND (name = book_path OR name LIKE '%' || split_part(book_path, '/', -1));
        
        DELETE FROM storage.objects 
        WHERE bucket_id = 'book-covers' 
        AND (name = book_path OR name LIKE '%' || split_part(book_path, '/', -1));
        
        -- محاولة حذف من bucket عام
        DELETE FROM storage.objects 
        WHERE bucket_id = 'public' 
        AND (name = book_path OR name LIKE '%' || split_part(book_path, '/', -1));
      END IF;
    END IF;
    
    -- حذف صورة المؤلف إذا كانت موجودة
    IF NEW.author_image_url IS NOT NULL AND NEW.author_image_url != '' THEN
      cover_path := substring(NEW.author_image_url from '/storage/v1/object/public/([^/]+)/(.+)$');
      
      IF cover_path IS NOT NULL THEN
        DELETE FROM storage.objects 
        WHERE bucket_id = 'book-covers' 
        AND (name = cover_path OR name LIKE '%' || split_part(cover_path, '/', -1));
        
        DELETE FROM storage.objects 
        WHERE bucket_id = 'book-files' 
        AND (name = cover_path OR name LIKE '%' || split_part(cover_path, '/', -1));
        
        DELETE FROM storage.objects 
        WHERE bucket_id = 'public' 
        AND (name = cover_path OR name LIKE '%' || split_part(cover_path, '/', -1));
      END IF;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- إنشاء Trigger لحذف الملفات عند رفض الكتاب
DROP TRIGGER IF EXISTS cleanup_rejected_book_files_trigger ON public.book_submissions;

CREATE TRIGGER cleanup_rejected_book_files_trigger
  AFTER UPDATE ON public.book_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_rejected_book_files();

-- دالة إضافية لحذف الملفات بشكل يدوي إذا لزم الأمر
CREATE OR REPLACE FUNCTION public.manual_cleanup_book_files(submission_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  book_record RECORD;
  cover_path TEXT;
  book_path TEXT;
  deleted_files INTEGER := 0;
BEGIN
  -- جلب بيانات الكتاب
  SELECT * INTO book_record 
  FROM public.book_submissions 
  WHERE id = submission_id;
  
  IF NOT FOUND THEN
    RETURN 'لم يتم العثور على الكتاب';
  END IF;
  
  -- حذف صورة الغلاف
  IF book_record.cover_image_url IS NOT NULL THEN
    cover_path := split_part(book_record.cover_image_url, '/', -1);
    
    DELETE FROM storage.objects 
    WHERE bucket_id IN ('book-covers', 'book-files', 'public')
    AND name LIKE '%' || cover_path;
    
    GET DIAGNOSTICS deleted_files = ROW_COUNT;
  END IF;
  
  -- حذف ملف الكتاب
  IF book_record.book_file_url IS NOT NULL THEN
    book_path := split_part(book_record.book_file_url, '/', -1);
    
    DELETE FROM storage.objects 
    WHERE bucket_id IN ('book-covers', 'book-files', 'public')
    AND name LIKE '%' || book_path;
    
    GET DIAGNOSTICS deleted_files = deleted_files + ROW_COUNT;
  END IF;
  
  -- حذف صورة المؤلف
  IF book_record.author_image_url IS NOT NULL THEN
    cover_path := split_part(book_record.author_image_url, '/', -1);
    
    DELETE FROM storage.objects 
    WHERE bucket_id IN ('book-covers', 'book-files', 'public')
    AND name LIKE '%' || cover_path;
    
    GET DIAGNOSTICS deleted_files = deleted_files + ROW_COUNT;
  END IF;
  
  RETURN 'تم حذف ' || deleted_files || ' ملف';
END;
$$;