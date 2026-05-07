-- استعادة شاملة لجميع الروابط المحذوفة والمعطلة
CREATE OR REPLACE FUNCTION public.comprehensive_restore_all_data()
RETURNS TABLE(
  book_id UUID, 
  book_title TEXT, 
  action_taken TEXT, 
  old_cover_url TEXT, 
  new_cover_url TEXT,
  old_book_url TEXT,
  new_book_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  book_record RECORD;
  cover_file RECORD;
  pdf_file RECORD;
  restored_count INTEGER := 0;
BEGIN
  -- استعادة جميع الكتب بغض النظر عن حالة الروابط
  FOR book_record IN
    SELECT 
      ab.id,
      ab.title,
      ab.author,
      ab.cover_image_url,
      ab.book_file_url,
      ab.user_id,
      ab.created_at
    FROM approved_books ab 
    WHERE ab.is_active = true 
    ORDER BY ab.created_at DESC
  LOOP
    
    -- البحث عن أفضل صورة غلاف متاحة لهذا الكتاب
    SELECT 
      so.name,
      so.bucket_id,
      so.created_at
    INTO cover_file
    FROM storage.objects so
    WHERE so.bucket_id IN ('covers', 'book-uploads', 'avatars')
      AND (so.name ILIKE '%.jpg' OR so.name ILIKE '%.png' OR so.name ILIKE '%.webp' OR so.name ILIKE '%.jpeg')
      AND (
        so.name LIKE '%' || book_record.user_id::text || '%'
        OR so.name LIKE '%cover%'
        OR so.created_at::date = book_record.created_at::date
        OR so.created_at BETWEEN (book_record.created_at - INTERVAL '1 day') 
                              AND (book_record.created_at + INTERVAL '1 day')
      )
    ORDER BY 
      CASE 
        WHEN so.name LIKE '%' || book_record.user_id::text || '%' THEN 1
        WHEN so.created_at::date = book_record.created_at::date THEN 2
        WHEN so.name LIKE '%cover%' THEN 3
        ELSE 4
      END,
      so.created_at DESC
    LIMIT 1;
    
    -- البحث عن أفضل ملف PDF متاح لهذا الكتاب
    SELECT 
      so.name,
      so.bucket_id,
      so.created_at
    INTO pdf_file
    FROM storage.objects so
    WHERE so.bucket_id IN ('books', 'book-uploads', 'book-files')
      AND so.name ILIKE '%.pdf'
      AND (
        so.name LIKE '%' || book_record.user_id::text || '%'
        OR so.name LIKE '%book%'
        OR so.created_at::date = book_record.created_at::date
        OR so.created_at BETWEEN (book_record.created_at - INTERVAL '1 day') 
                              AND (book_record.created_at + INTERVAL '1 day')
      )
    ORDER BY 
      CASE 
        WHEN so.name LIKE '%' || book_record.user_id::text || '%' THEN 1
        WHEN so.created_at::date = book_record.created_at::date THEN 2
        WHEN so.name LIKE '%book%' THEN 3
        ELSE 4
      END,
      so.created_at DESC
    LIMIT 1;
    
    -- تحديث الكتاب بالروابط الجديدة
    UPDATE approved_books 
    SET 
      cover_image_url = CASE 
        WHEN cover_file.name IS NOT NULL THEN 
          'https://kydmyxsgyxeubhmqzrgo.supabase.co/storage/v1/object/public/' || cover_file.bucket_id || '/' || cover_file.name
        ELSE cover_image_url
      END,
      book_file_url = CASE 
        WHEN pdf_file.name IS NOT NULL THEN 
          'https://kydmyxsgyxeubhmqzrgo.supabase.co/storage/v1/object/public/' || pdf_file.bucket_id || '/' || pdf_file.name
        ELSE book_file_url
      END
    WHERE id = book_record.id;
    
    -- إرجاع نتائج العملية
    RETURN QUERY SELECT 
      book_record.id,
      book_record.title,
      CASE 
        WHEN cover_file.name IS NOT NULL AND pdf_file.name IS NOT NULL THEN 'تم استعادة الصورة والملف'
        WHEN cover_file.name IS NOT NULL THEN 'تم استعادة الصورة فقط'
        WHEN pdf_file.name IS NOT NULL THEN 'تم استعادة الملف فقط'
        ELSE 'لم يتم العثور على ملفات'
      END::TEXT,
      book_record.cover_image_url,
      CASE 
        WHEN cover_file.name IS NOT NULL THEN 
          'https://kydmyxsgyxeubhmqzrgo.supabase.co/storage/v1/object/public/' || cover_file.bucket_id || '/' || cover_file.name
        ELSE NULL
      END::TEXT,
      book_record.book_file_url,
      CASE 
        WHEN pdf_file.name IS NOT NULL THEN 
          'https://kydmyxsgyxeubhmqzrgo.supabase.co/storage/v1/object/public/' || pdf_file.bucket_id || '/' || pdf_file.name
        ELSE NULL
      END::TEXT;
      
    restored_count := restored_count + 1;
    
  END LOOP;
  
  -- إضافة رسالة ختامية
  RETURN QUERY SELECT 
    NULL::UUID,
    ('تم معالجة ' || restored_count::TEXT || ' كتاب')::TEXT,
    'عملية الاستعادة مكتملة'::TEXT,
    NULL::TEXT,
    NULL::TEXT,
    NULL::TEXT,
    NULL::TEXT;
    
END;
$function$;

-- تشغيل الدالة الشاملة للاستعادة
SELECT * FROM public.comprehensive_restore_all_data();