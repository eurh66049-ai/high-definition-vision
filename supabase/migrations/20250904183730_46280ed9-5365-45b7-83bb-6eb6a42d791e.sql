-- إنشاء أو تحديث دالة الإشعارات للموافقة على الكتب
CREATE OR REPLACE FUNCTION public.notify_book_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- التحقق من تغيير الحالة من pending إلى approved
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    -- التحقق من عدم وجود إشعار موافقة مسبق لهذا الكتاب
    IF NOT EXISTS (
      SELECT 1 FROM public.notifications 
      WHERE user_id = NEW.user_id 
        AND book_submission_id = NEW.id 
        AND type = 'success'
        AND title LIKE '%موافقة%'
    ) THEN
      -- إنشاء إشعار الموافقة
      INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        book_submission_id,
        book_title,
        book_author,
        book_category,
        created_at
      ) VALUES (
        NEW.user_id,
        'تمت الموافقة على كتابك! 🎉',
        'مبروك! تم قبول كتاب "' || NEW.title || '" بنجاح وسيتم إضافته إلى المكتبة قريباً. شكراً لإثراء المكتبة العربية!',
        'success',
        NEW.id,
        NEW.title,
        NEW.author,
        NEW.category,
        COALESCE(NEW.reviewed_at, NOW())
      );
    END IF;
  
  -- التحقق من تغيير الحالة إلى rejected
  ELSIF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
    -- التحقق من عدم وجود إشعار رفض مسبق لهذا الكتاب
    IF NOT EXISTS (
      SELECT 1 FROM public.notifications 
      WHERE user_id = NEW.user_id 
        AND book_submission_id = NEW.id 
        AND type = 'error'
        AND title LIKE '%رفض%'
    ) THEN
      -- إنشاء إشعار الرفض
      INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        book_submission_id,
        book_title,
        book_author,
        book_category,
        created_at
      ) VALUES (
        NEW.user_id,
        'تم رفض كتابك ❌',
        'نأسف لإبلاغك أن كتاب "' || NEW.title || '" لم يتم قبوله. ' || 
        CASE 
          WHEN NEW.reviewer_notes IS NOT NULL AND NEW.reviewer_notes != '' 
          THEN 'السبب: ' || NEW.reviewer_notes || '. يمكنك تعديل الكتاب وإعادة رفعه مرة أخرى.'
          ELSE 'يمكنك مراجعة متطلبات النشر وإعادة المحاولة.'
        END,
        'error',
        NEW.id,
        NEW.title,
        NEW.author,
        NEW.category,
        COALESCE(NEW.reviewed_at, NOW())
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- حذف أي trigger موجود مسبقاً
DROP TRIGGER IF EXISTS book_status_notification_trigger ON public.book_submissions;

-- إنشاء التريغر الجديد
CREATE TRIGGER book_status_notification_trigger
  AFTER UPDATE ON public.book_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_book_status_change();

-- إنشاء دالة مساعدة لتحديث حالة الكتاب مع ضمان وقت المراجعة
CREATE OR REPLACE FUNCTION public.update_book_submission_status(
  p_submission_id UUID,
  p_new_status TEXT,
  p_reviewer_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  submission_record RECORD;
BEGIN
  -- جلب بيانات الكتاب للتأكد من وجوده
  SELECT * INTO submission_record 
  FROM public.book_submissions 
  WHERE id = p_submission_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- تحديث حالة الكتاب مع تحديد وقت المراجعة
  UPDATE public.book_submissions 
  SET 
    status = p_new_status,
    reviewer_notes = COALESCE(p_reviewer_notes, reviewer_notes),
    reviewed_at = NOW()
  WHERE id = p_submission_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;