
-- تحسين دالة تنظيف الإشعارات المكررة
CREATE OR REPLACE FUNCTION public.clean_duplicate_notifications()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- حذف الإشعارات المكررة بناءً على معايير أكثر دقة
  WITH duplicates AS (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY 
               user_id, 
               type, 
               COALESCE(book_submission_id::text, ''),
               LEFT(title, 50),  -- أول 50 حرف من العنوان
               LEFT(message, 100) -- أول 100 حرف من الرسالة
             ORDER BY created_at DESC
           ) as rn
    FROM public.notifications
    WHERE created_at >= NOW() - INTERVAL '7 days' -- فقط الإشعارات الحديثة
  )
  DELETE FROM public.notifications 
  WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
  );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

-- تشغيل الدالة لتنظيف الإشعارات المكررة الحالية
SELECT public.clean_duplicate_notifications();

-- تحسين trigger لمنع الإشعارات المكررة
CREATE OR REPLACE FUNCTION public.notify_book_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- فقط إذا تم تغيير الحالة من pending إلى approved
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    -- التحقق من عدم وجود إشعار موافقة مسبق لنفس الكتاب في آخر 24 ساعة
    IF NOT EXISTS (
      SELECT 1 FROM public.notifications 
      WHERE user_id = NEW.user_id 
        AND book_submission_id = NEW.id 
        AND type = 'success'
        AND title LIKE '%موافقة%'
        AND created_at >= NOW() - INTERVAL '24 hours'
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
        'تم قبول كتاب "' || NEW.title || '" وسيتم إضافته إلى المكتبة قريباً.',
        'success',
        NEW.id,
        NEW.title,
        NEW.author,
        NEW.category,
        COALESCE(NEW.reviewed_at, NOW())
      );
    END IF;
  
  -- فقط إذا تم تغيير الحالة من pending إلى rejected
  ELSIF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
    -- التحقق من عدم وجود إشعار رفض مسبق لنفس الكتاب في آخر 24 ساعة
    IF NOT EXISTS (
      SELECT 1 FROM public.notifications 
      WHERE user_id = NEW.user_id 
        AND book_submission_id = NEW.id 
        AND type = 'error'
        AND title LIKE '%رفض%'
        AND created_at >= NOW() - INTERVAL '24 hours'
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
