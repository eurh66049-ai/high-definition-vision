-- إصلاح التريجر المسؤول عن إرسال الإشعارات للتعامل مع user_id = null
-- هذا سيحل مشكلة الكتب المرفوعة عبر CSV

-- حذف التريجر والدالة الحالية
DROP TRIGGER IF EXISTS book_submission_status_change_trigger ON book_submissions;
DROP FUNCTION IF EXISTS handle_book_submission_status_change();

-- إنشاء دالة محدثة للتعامل مع user_id = null
CREATE OR REPLACE FUNCTION handle_book_submission_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- إرسال إشعار فقط إذا كان user_id موجود
  IF NEW.user_id IS NOT NULL THEN
    -- إذا تم تغيير الحالة إلى approved
    IF OLD.status != 'approved' AND NEW.status = 'approved' THEN
      INSERT INTO notifications (
        user_id,
        title,
        message,
        type,
        is_read,
        created_at,
        book_submission_id,
        book_title,
        book_author,
        book_category
      ) VALUES (
        NEW.user_id,
        'تم قبول كتابك ✅',
        'مبروك! تم قبول كتاب "' || COALESCE(NEW.title, 'غير محدد') || '" ونشره بنجاح. يمكن للقراء الآن الوصول إليه والاستمتاع بقراءته.',
        'success',
        false,
        NOW(),
        NEW.id,
        NEW.title,
        NEW.author,
        NEW.category
      );
    END IF;

    -- إذا تم تغيير الحالة إلى rejected
    IF OLD.status != 'rejected' AND NEW.status = 'rejected' THEN
      INSERT INTO notifications (
        user_id,
        title,
        message,
        type,
        is_read,
        created_at,
        book_submission_id,
        book_title,
        book_author,
        book_category
      ) VALUES (
        NEW.user_id,
        'تم رفض كتابك ❌',
        'نأسف لإبلاغك أن كتاب "' || COALESCE(NEW.title, 'غير محدد') || '" لم يتم قبوله. ' || 
        CASE 
          WHEN NEW.reviewer_notes IS NOT NULL AND NEW.reviewer_notes != '' 
          THEN 'السبب: ' || NEW.reviewer_notes 
          ELSE 'يرجى مراجعة معايير النشر وإعادة المحاولة.'
        END,
        'error',
        false,
        NOW(),
        NEW.id,
        NEW.title,
        NEW.author,
        NEW.category
      );
    END IF;
  ELSE
    -- تسجيل في logs أن الإشعار تم تخطيه بسبب عدم وجود user_id
    RAISE NOTICE 'تم تخطي إرسال إشعار للكتاب % بسبب عدم وجود user_id', NEW.title;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء التريجر المحدث
CREATE TRIGGER book_submission_status_change_trigger
  AFTER UPDATE ON book_submissions
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION handle_book_submission_status_change();