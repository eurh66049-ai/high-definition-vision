-- إصلاح الـ trigger ليتحقق من وجود الحقل أولاً
CREATE OR REPLACE FUNCTION public.normalize_author_bio_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- تطبيع نبذة المؤلف فقط إذا كان الحقل موجود في الجدول
  IF TG_TABLE_NAME = 'book_submissions' AND NEW.author_bio IS NOT NULL AND NEW.author_bio != '' THEN
    NEW.author_bio := public.normalize_author_bio(NEW.author_bio);
  ELSIF TG_TABLE_NAME = 'authors' AND NEW.bio IS NOT NULL AND NEW.bio != '' THEN
    NEW.bio := public.normalize_author_bio(NEW.bio);
  END IF;
  
  RETURN NEW;
END;
$$;