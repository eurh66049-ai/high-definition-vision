-- دالة لتحديث تعريف المؤلف في جميع كتبه
CREATE OR REPLACE FUNCTION update_author_bio_in_books(p_author_name text, p_new_bio text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  updated_count INTEGER;
BEGIN
  -- تحديث author_bio في جميع الكتب للمؤلف المحدد
  UPDATE public.book_submissions 
  SET author_bio = p_new_bio
  WHERE author = p_author_name 
    AND status = 'approved';
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RETURN updated_count;
END;
$function$;