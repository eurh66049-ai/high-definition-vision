
-- تحسين دالة تنظيف الإشعارات المكررة بشكل نهائي
CREATE OR REPLACE FUNCTION public.clean_duplicate_notifications()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- حذف الإشعارات المكررة بناءً على معايير دقيقة جداً
  WITH duplicates AS (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY 
               user_id, 
               book_submission_id,
               type,
               LEFT(title, 30), -- أول 30 حرف من العنوان
               DATE_TRUNC('hour', created_at) -- نفس الساعة
             ORDER BY created_at DESC
           ) as rn
    FROM public.notifications
    WHERE created_at >= NOW() - INTERVAL '7 days'
      AND book_submission_id IS NOT NULL
  )
  DELETE FROM public.notifications 
  WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
  );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

-- تحديث التريغر لمنع الإشعارات المكررة بشكل نهائي
CREATE OR REPLACE FUNCTION public.notify_book_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- فقط إذا تم تغيير الحالة من pending إلى approved
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    -- التحقق الصارم من عدم وجود إشعار موافقة مسبق
    IF NOT EXISTS (
      SELECT 1 FROM public.notifications 
      WHERE user_id = NEW.user_id 
        AND book_submission_id = NEW.id 
        AND type = 'success'
        AND title LIKE '%موافقة%'
        AND created_at >= NOW() - INTERVAL '2 hours' -- في آخر ساعتين فقط
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
        NOW()
      );
    END IF;
  
  -- فقط إذا تم تغيير الحالة من pending إلى rejected
  ELSIF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
    -- التحقق الصارم من عدم وجود إشعار رفض مسبق
    IF NOT EXISTS (
      SELECT 1 FROM public.notifications 
      WHERE user_id = NEW.user_id 
        AND book_submission_id = NEW.id 
        AND type = 'error'
        AND title LIKE '%رفض%'
        AND created_at >= NOW() - INTERVAL '2 hours' -- في آخر ساعتين فقط
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
        NOW()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- تشغيل دالة تنظيف الإشعارات المكررة
SELECT public.clean_duplicate_notifications();

-- إضافة فهرس فريد لمنع التكرار مستقبلاً
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_unique_book_approval 
ON public.notifications (user_id, book_submission_id, type, DATE_TRUNC('hour', created_at))
WHERE book_submission_id IS NOT NULL AND type IN ('success', 'error');
