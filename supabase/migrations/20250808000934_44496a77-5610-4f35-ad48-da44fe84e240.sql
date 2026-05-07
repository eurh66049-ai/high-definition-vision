-- تحديث إيميل المؤلفين بناءً على إيميلات المستخدمين في طلبات الكتب
UPDATE authors 
SET email = (
  SELECT DISTINCT bs.user_email 
  FROM book_submissions bs 
  WHERE bs.author = authors.name 
    AND bs.user_id = authors.user_id 
    AND bs.user_email IS NOT NULL 
    AND bs.user_email != ''
  LIMIT 1
)
WHERE authors.email IS NULL 
  AND EXISTS (
    SELECT 1 FROM book_submissions bs 
    WHERE bs.author = authors.name 
      AND bs.user_id = authors.user_id 
      AND bs.user_email IS NOT NULL 
      AND bs.user_email != ''
  );

-- إنشاء دالة لتحديث إيميل المؤلف تلقائياً عند إدراج كتاب جديد
CREATE OR REPLACE FUNCTION update_author_email_from_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- تحديث إيميل المؤلف إذا لم يكن موجوداً وتم توفير إيميل في طلب الكتاب
  UPDATE authors 
  SET email = NEW.user_email
  WHERE name = NEW.author 
    AND user_id = NEW.user_id 
    AND (email IS NULL OR email = '')
    AND NEW.user_email IS NOT NULL 
    AND NEW.user_email != '';
    
  RETURN NEW;
END;
$$;

-- إنشاء trigger لتطبيق الدالة عند إدراج طلب كتاب جديد
CREATE TRIGGER trigger_update_author_email_from_submission
  AFTER INSERT ON book_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_author_email_from_submission();