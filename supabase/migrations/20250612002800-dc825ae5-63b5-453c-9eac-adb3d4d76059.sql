
-- حذف الدالة الموجودة أولاً
DROP FUNCTION IF EXISTS public.get_book_details(text);

-- إزالة الأعمدة غير المطلوبة من جدول approved_books
ALTER TABLE public.approved_books 
DROP COLUMN IF EXISTS publisher,
DROP COLUMN IF EXISTS translator;

-- إزالة الأعمدة غير المطلوبة من جدول book_submissions
ALTER TABLE public.book_submissions 
DROP COLUMN IF EXISTS publisher,
DROP COLUMN IF EXISTS translator;

-- إنشاء الدالة مرة أخرى بدون الحقول المحذوفة
CREATE OR REPLACE FUNCTION public.get_book_details(p_book_id text)
 RETURNS TABLE(
   id text, 
   title text, 
   subtitle text, 
   author text, 
   category text, 
   description text, 
   language text, 
   publication_year integer, 
   page_count integer, 
   cover_image_url text, 
   book_file_url text, 
   file_type text, 
   display_type text, 
   views integer, 
   rating numeric, 
   created_at timestamp with time zone, 
   user_email text
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  book_uuid UUID;
BEGIN
  -- تحويل النص إلى UUID إذا أمكن
  BEGIN
    book_uuid := p_book_id::UUID;
  EXCEPTION WHEN others THEN
    RETURN;
  END;
  
  RETURN QUERY
  SELECT 
    ab.id::text,
    ab.title,
    ab.subtitle,
    ab.author,
    ab.category,
    ab.description,
    ab.language,
    ab.publication_year,
    ab.page_count,
    ab.cover_image_url,
    ab.book_file_url,
    ab.file_type,
    ab.display_type,
    ab.views,
    ab.rating,
    ab.created_at,
    ab.user_email
  FROM public.approved_books ab
  WHERE ab.id = book_uuid
    AND ab.is_active = true;
END;
$function$;
