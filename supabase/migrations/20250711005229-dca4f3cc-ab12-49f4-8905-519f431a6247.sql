-- إصلاح روابط الصور والملفات المعطلة عبر ربطها بالملفات الموجودة في storage
CREATE OR REPLACE FUNCTION public.restore_broken_media_links()
RETURNS TABLE(book_id UUID, book_title TEXT, action_taken TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  book_record RECORD;
  storage_file RECORD;
  updated_count INTEGER := 0;
BEGIN
  -- إصلاح روابط صور الأغلفة
  FOR book_record IN
    SELECT 
      ab.id,
      ab.title,
      ab.cover_image_url,
      ab.book_file_url,
      ab.user_id
    FROM approved_books ab 
    WHERE ab.is_active = true 
      AND ab.cover_image_url IS NOT NULL 
      AND ab.cover_image_url != ''
      AND NOT EXISTS (
        SELECT 1 FROM storage.objects so 
        WHERE ab.cover_image_url LIKE '%' || so.name || '%'
      )
  LOOP
    -- البحث عن صورة مناسبة في storage
    SELECT 
      so.name,
      so.bucket_id
    INTO storage_file
    FROM storage.objects so
    WHERE so.bucket_id IN ('covers', 'book-uploads')
      AND (so.name LIKE '%' || book_record.user_id::text || '%'
           OR so.name LIKE '%covers%')
      AND (so.name ILIKE '%.jpg' OR so.name ILIKE '%.png' OR so.name ILIKE '%.webp' OR so.name ILIKE '%.jpeg')
    ORDER BY so.created_at DESC
    LIMIT 1;
    
    IF storage_file.name IS NOT NULL THEN
      -- تحديث رابط الصورة
      UPDATE approved_books 
      SET cover_image_url = 'https://kydmyxsgyxeubhmqzrgo.supabase.co/storage/v1/object/public/' || storage_file.bucket_id || '/' || storage_file.name
      WHERE id = book_record.id;
      
      RETURN QUERY SELECT book_record.id, book_record.title, 'تم إصلاح رابط صورة الغلاف'::TEXT;
    END IF;
  END LOOP;

  -- إصلاح روابط ملفات PDF
  FOR book_record IN
    SELECT 
      ab.id,
      ab.title,
      ab.book_file_url,
      ab.user_id
    FROM approved_books ab 
    WHERE ab.is_active = true 
      AND ab.book_file_url IS NOT NULL 
      AND ab.book_file_url != ''
      AND NOT EXISTS (
        SELECT 1 FROM storage.objects so 
        WHERE ab.book_file_url LIKE '%' || so.name || '%'
      )
  LOOP
    -- البحث عن ملف PDF مناسب في storage
    SELECT 
      so.name,
      so.bucket_id
    INTO storage_file
    FROM storage.objects so
    WHERE so.bucket_id IN ('books', 'book-uploads', 'book-files')
      AND (so.name LIKE '%' || book_record.user_id::text || '%'
           OR so.name LIKE '%books%')
      AND so.name ILIKE '%.pdf'
    ORDER BY so.created_at DESC
    LIMIT 1;
    
    IF storage_file.name IS NOT NULL THEN
      -- تحديث رابط الملف
      UPDATE approved_books 
      SET book_file_url = 'https://kydmyxsgyxeubhmqzrgo.supabase.co/storage/v1/object/public/' || storage_file.bucket_id || '/' || storage_file.name
      WHERE id = book_record.id;
      
      RETURN QUERY SELECT book_record.id, book_record.title, 'تم إصلاح رابط ملف الكتاب'::TEXT;
    END IF;
  END LOOP;

  -- إنشاء روابط جديدة للكتب التي ليس لها روابط
  FOR book_record IN
    SELECT 
      ab.id,
      ab.title,
      ab.user_id
    FROM approved_books ab 
    WHERE ab.is_active = true 
      AND (ab.cover_image_url IS NULL OR ab.cover_image_url = '')
  LOOP
    -- البحث عن صورة غلاف
    SELECT 
      so.name,
      so.bucket_id
    INTO storage_file
    FROM storage.objects so
    WHERE so.bucket_id IN ('covers', 'book-uploads')
      AND so.name LIKE '%' || book_record.user_id::text || '%'
      AND (so.name ILIKE '%.jpg' OR so.name ILIKE '%.png' OR so.name ILIKE '%.webp' OR so.name ILIKE '%.jpeg')
    ORDER BY so.created_at DESC
    LIMIT 1;
    
    IF storage_file.name IS NOT NULL THEN
      UPDATE approved_books 
      SET cover_image_url = 'https://kydmyxsgyxeubhmqzrgo.supabase.co/storage/v1/object/public/' || storage_file.bucket_id || '/' || storage_file.name
      WHERE id = book_record.id;
      
      RETURN QUERY SELECT book_record.id, book_record.title, 'تم إضافة رابط صورة غلاف جديد'::TEXT;
    END IF;
  END LOOP;

  FOR book_record IN
    SELECT 
      ab.id,
      ab.title,
      ab.user_id
    FROM approved_books ab 
    WHERE ab.is_active = true 
      AND (ab.book_file_url IS NULL OR ab.book_file_url = '')
  LOOP
    -- البحث عن ملف PDF
    SELECT 
      so.name,
      so.bucket_id
    INTO storage_file
    FROM storage.objects so
    WHERE so.bucket_id IN ('books', 'book-uploads', 'book-files')
      AND so.name LIKE '%' || book_record.user_id::text || '%'
      AND so.name ILIKE '%.pdf'
    ORDER BY so.created_at DESC
    LIMIT 1;
    
    IF storage_file.name IS NOT NULL THEN
      UPDATE approved_books 
      SET book_file_url = 'https://kydmyxsgyxeubhmqzrgo.supabase.co/storage/v1/object/public/' || storage_file.bucket_id || '/' || storage_file.name
      WHERE id = book_record.id;
      
      RETURN QUERY SELECT book_record.id, book_record.title, 'تم إضافة رابط ملف كتاب جديد'::TEXT;
    END IF;
  END LOOP;
END;
$function$;

-- تشغيل الدالة لإصلاح الروابط
SELECT * FROM public.restore_broken_media_links();