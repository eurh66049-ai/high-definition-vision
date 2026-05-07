-- إنشاء دالة لتنظيف حقل الناشر من كلمة download_read
CREATE OR REPLACE FUNCTION clean_publisher_field()
RETURNS TRIGGER AS $$
BEGIN
  -- تنظيف حقل الناشر من كلمة download_read
  IF NEW.publisher IS NOT NULL THEN
    NEW.publisher := TRIM(REGEXP_REPLACE(NEW.publisher, 'download_read', '', 'gi'));
    
    -- إذا أصبح الحقل فارغ بعد التنظيف، اجعله NULL
    IF NEW.publisher = '' THEN
      NEW.publisher := NULL;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger لجدول approved_books
CREATE TRIGGER clean_publisher_approved_books
  BEFORE INSERT OR UPDATE ON approved_books
  FOR EACH ROW
  EXECUTE FUNCTION clean_publisher_field();

-- إنشاء trigger لجدول book_submissions  
CREATE TRIGGER clean_publisher_book_submissions
  BEFORE INSERT OR UPDATE ON book_submissions
  FOR EACH ROW
  EXECUTE FUNCTION clean_publisher_field();