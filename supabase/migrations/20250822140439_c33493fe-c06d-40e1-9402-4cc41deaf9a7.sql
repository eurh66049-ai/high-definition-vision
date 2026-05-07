-- إزالة دالة notify_book_status_change التي تسبب إشعارات مكررة
-- لأن لدينا دالة محسنة handle_book_status_change_with_email تتعامل مع هذا الأمر

DROP FUNCTION IF EXISTS public.notify_book_status_change() CASCADE;

-- تنظيف الإشعارات المكررة الموجودة
WITH duplicate_notifications AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, book_submission_id, type, title 
      ORDER BY created_at DESC
    ) as rn
  FROM public.notifications
  WHERE book_submission_id IS NOT NULL
)
DELETE FROM public.notifications 
WHERE id IN (
  SELECT id FROM duplicate_notifications WHERE rn > 1
);