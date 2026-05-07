-- حذف الإشعارات التي تحتوي على النص المطلوب حذفه
DELETE FROM public.notifications 
WHERE message LIKE '%يرجى تحديث بريدك الإلكتروني%';

-- تحديث دالة الإشعارات لإزالة الجملة غير المرغوب فيها
CREATE OR REPLACE FUNCTION public.notify_book_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- إذا تم تغيير الحالة من pending إلى approved
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    -- التحقق من عدم وجود إشعار موافقة مسبق
    IF NOT EXISTS (
      SELECT 1 FROM public.notifications 
      WHERE user_id = NEW.user_id 
        AND book_submission_id = NEW.id 
        AND type = 'success'
        AND title LIKE '%موافقة%'
    ) THEN
      INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        book_submission_id,
        book_title,
        created_at
      ) VALUES (
        NEW.user_id,
        'تمت الموافقة على كتابك! 🎉',
        'تم قبول كتاب "' || NEW.title || '" وأصبح متاحاً الآن في المكتبة.',
        'success',
        NEW.id,
        NEW.title,
        COALESCE(NEW.reviewed_at, NOW())
      );
    END IF;
  
  -- إذا تم رفض الكتاب
  ELSIF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
    -- التحقق من عدم وجود إشعار رفض مسبق
    IF NOT EXISTS (
      SELECT 1 FROM public.notifications 
      WHERE user_id = NEW.user_id 
        AND book_submission_id = NEW.id 
        AND type = 'error'
        AND title LIKE '%رفض%'
    ) THEN
      INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        book_submission_id,
        book_title,
        created_at
      ) VALUES (
        NEW.user_id,
        'تم رفض كتابك ❌',
        'نأسف لإبلاغك أن كتاب "' || NEW.title || '" لم يتم قبوله. ' || COALESCE('السبب: ' || NEW.reviewer_notes, ''),
        'error',
        NEW.id,
        NEW.title,
        COALESCE(NEW.reviewed_at, NOW())
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;