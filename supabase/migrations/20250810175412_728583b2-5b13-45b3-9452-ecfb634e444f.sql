-- إنشاء trigger لمزامنة بيانات المؤلف في جدول book_submissions عند تحديث جدول authors
CREATE OR REPLACE FUNCTION public.sync_author_data_in_books()
RETURNS TRIGGER AS $$
BEGIN
  -- تحديث بيانات المؤلف في جميع الكتب عند تغيير بيانات المؤلف
  UPDATE public.book_submissions 
  SET 
    author_bio = NEW.bio,
    author_image_url = COALESCE(NEW.avatar_url, author_image_url)
  WHERE 
    LOWER(TRIM(author)) = LOWER(TRIM(NEW.name))
    AND status = 'approved';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger يتم تشغيله عند تحديث جدول authors
CREATE TRIGGER sync_author_data_trigger
  AFTER UPDATE ON public.authors
  FOR EACH ROW
  WHEN (
    OLD.bio IS DISTINCT FROM NEW.bio OR 
    OLD.avatar_url IS DISTINCT FROM NEW.avatar_url
  )
  EXECUTE FUNCTION public.sync_author_data_in_books();