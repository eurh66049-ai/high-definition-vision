-- تحديث view approved_books لتشمل slug
CREATE OR REPLACE VIEW public.approved_books AS
SELECT 
    book_submissions.id,
    book_submissions.user_id,
    book_submissions.title,
    book_submissions.subtitle,
    book_submissions.author,
    book_submissions.author_bio,
    book_submissions.author_image_url,
    book_submissions.category,
    book_submissions.publisher,
    book_submissions.translator,
    book_submissions.description,
    book_submissions.publication_year,
    book_submissions.page_count,
    book_submissions.language,
    book_submissions.display_type,
    book_submissions.cover_image_url,
    book_submissions.book_file_url,
    book_submissions.file_type,
    book_submissions.file_size,
    book_submissions.file_metadata,
    book_submissions.rights_confirmation,
    book_submissions.created_at,
    book_submissions.reviewed_at,
    book_submissions.user_email,
    book_submissions.processing_status,
    book_submissions.views,
    book_submissions.rating,
    book_submissions.slug,
    true AS is_active
FROM book_submissions
WHERE (book_submissions.status = 'approved'::text);

-- تحديث دالة get_book_details لتقبل slug أو UUID
CREATE OR REPLACE FUNCTION public.get_book_details(p_book_id text)
 RETURNS TABLE(
   id text, 
   title text, 
   subtitle text, 
   author text, 
   author_bio text, 
   author_image_url text, 
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
   user_email text, 
   file_size bigint,
   slug text
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
DECLARE
  book_uuid UUID;
BEGIN
  -- أولاً، محاولة البحث بـ slug
  RETURN QUERY
  SELECT 
    ab.id::text,
    ab.title,
    ab.subtitle,
    ab.author,
    ab.author_bio,
    ab.author_image_url,
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
    ab.user_email,
    ab.file_size,
    ab.slug
  FROM public.approved_books ab
  WHERE ab.slug = p_book_id
    AND ab.is_active = true;
  
  -- إذا لم نجد نتيجة بـ slug، نحاول بـ UUID
  IF NOT FOUND THEN
    BEGIN
      book_uuid := p_book_id::UUID;
      
      RETURN QUERY
      SELECT 
        ab.id::text,
        ab.title,
        ab.subtitle,
        ab.author,
        ab.author_bio,
        ab.author_image_url,
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
        ab.user_email,
        ab.file_size,
        ab.slug
      FROM public.approved_books ab
      WHERE ab.id = book_uuid
        AND ab.is_active = true;
        
    EXCEPTION WHEN others THEN
      -- إذا فشل تحويل UUID، لا نفعل شيئاً
      RETURN;
    END;
  END IF;
END;
$$;