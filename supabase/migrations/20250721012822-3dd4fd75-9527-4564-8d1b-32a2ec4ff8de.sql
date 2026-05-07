-- حذف استدعاء توليد HTML بالكامل من دالة handle_book_status_change_with_html
CREATE OR REPLACE FUNCTION public.handle_book_status_change_with_html()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- فقط إذا تم تغيير الحالة من pending إلى approved
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    -- التحقق من عدم وجود إشعار موافقة مسبق لنفس الكتاب
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
        book_author,
        book_category,
        created_at
      ) VALUES (
        NEW.user_id,
        'تمت الموافقة على كتابك! 🎉',
        'تم قبول كتاب "' || NEW.title || '" وأصبح متاحاً الآن في المكتبة.',
        'success',
        NEW.id,
        NEW.title,
        NEW.author,
        NEW.category,
        COALESCE(NEW.reviewed_at, NOW())
      );
    END IF;
    
    -- تم إزالة استدعاء توليد HTML بالكامل
  
  -- فقط إذا تم تغيير الحالة من pending إلى rejected
  ELSIF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
    -- التحقق من عدم وجود إشعار رفض مسبق لنفس الكتاب
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
        book_author,
        book_category,
        created_at
      ) VALUES (
        NEW.user_id,
        'تم رفض كتابك ❌',
        'نأسف لإبلاغك أن كتاب "' || NEW.title || '" لم يتم قبوله. ' || COALESCE('السبب: ' || NEW.reviewer_notes, ''),
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
$$;