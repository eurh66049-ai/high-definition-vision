-- إنشاء دالة لحذف ملفات الكتاب المرفوض من Storage
CREATE OR REPLACE FUNCTION public.cleanup_rejected_book_files()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cover_filename TEXT;
  book_filename TEXT;
BEGIN
  -- فقط إذا تم تغيير الحالة إلى rejected
  IF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
    
    -- حذف صورة الغلاف
    IF NEW.cover_image_url IS NOT NULL AND NEW.cover_image_url != '' THEN
      -- استخراج اسم الملف من الرابط
      cover_filename := split_part(NEW.cover_image_url, '/', -1);
      
      IF cover_filename IS NOT NULL AND cover_filename != '' THEN
        -- محاولة حذف من مجلدات مختلفة
        DELETE FROM storage.objects 
        WHERE bucket_id = 'book-covers' 
        AND (name = cover_filename OR name LIKE '%' || cover_filename);
        
        DELETE FROM storage.objects 
        WHERE bucket_id = 'book-files' 
        AND (name = cover_filename OR name LIKE '%' || cover_filename);
        
        DELETE FROM storage.objects 
        WHERE bucket_id = 'public' 
        AND (name = cover_filename OR name LIKE '%' || cover_filename);
        
        -- محاولة حذف من مجلد covers
        DELETE FROM storage.objects 
        WHERE bucket_id = 'book-covers' 
        AND name LIKE 'covers/%' || cover_filename;
        
        DELETE FROM storage.objects 
        WHERE bucket_id = 'book-files' 
        AND name LIKE 'covers/%' || cover_filename;
      END IF;
    END IF;
    
    -- حذف ملف الكتاب PDF
    IF NEW.book_file_url IS NOT NULL AND NEW.book_file_url != '' THEN
      -- استخراج اسم الملف من الرابط
      book_filename := split_part(NEW.book_file_url, '/', -1);
      
      IF book_filename IS NOT NULL AND book_filename != '' THEN
        -- محاولة حذف من مجلدات مختلفة
        DELETE FROM storage.objects 
        WHERE bucket_id = 'book-files' 
        AND (name = book_filename OR name LIKE '%' || book_filename);
        
        DELETE FROM storage.objects 
        WHERE bucket_id = 'book-covers' 
        AND (name = book_filename OR name LIKE '%' || book_filename);
        
        DELETE FROM storage.objects 
        WHERE bucket_id = 'public' 
        AND (name = book_filename OR name LIKE '%' || book_filename);
        
        -- محاولة حذف من مجلد pdfs
        DELETE FROM storage.objects 
        WHERE bucket_id = 'book-files' 
        AND name LIKE 'pdfs/%' || book_filename;
        
        DELETE FROM storage.objects 
        WHERE bucket_id = 'book-covers' 
        AND name LIKE 'pdfs/%' || book_filename;
      END IF;
    END IF;
    
    -- حذف صورة المؤلف إذا كانت موجودة
    IF NEW.author_image_url IS NOT NULL AND NEW.author_image_url != '' THEN
      cover_filename := split_part(NEW.author_image_url, '/', -1);
      
      IF cover_filename IS NOT NULL AND cover_filename != '' THEN
        DELETE FROM storage.objects 
        WHERE bucket_id IN ('book-covers', 'book-files', 'public')
        AND (name = cover_filename OR name LIKE '%' || cover_filename);
        
        -- محاولة حذف من مجلد authors
        DELETE FROM storage.objects 
        WHERE bucket_id IN ('book-covers', 'book-files')
        AND name LIKE 'authors/%' || cover_filename;
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
  cover_filename TEXT;
  book_filename TEXT;
  deleted_count INTEGER := 0;
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
    cover_filename := split_part(book_record.cover_image_url, '/', -1);
    
    DELETE FROM storage.objects 
    WHERE bucket_id IN ('book-covers', 'book-files', 'public')
    AND name LIKE '%' || cover_filename;
    
    deleted_count := deleted_count + 1;
  END IF;
  
  -- حذف ملف الكتاب
  IF book_record.book_file_url IS NOT NULL THEN
    book_filename := split_part(book_record.book_file_url, '/', -1);
    
    DELETE FROM storage.objects 
    WHERE bucket_id IN ('book-covers', 'book-files', 'public')
    AND name LIKE '%' || book_filename;
    
    deleted_count := deleted_count + 1;
  END IF;
  
  -- حذف صورة المؤلف
  IF book_record.author_image_url IS NOT NULL THEN
    cover_filename := split_part(book_record.author_image_url, '/', -1);
    
    DELETE FROM storage.objects 
    WHERE bucket_id IN ('book-covers', 'book-files', 'public')
    AND name LIKE '%' || cover_filename;
    
    deleted_count := deleted_count + 1;
  END IF;
  
  RETURN 'تمت معالجة ' || deleted_count || ' ملف';
END;
$$;