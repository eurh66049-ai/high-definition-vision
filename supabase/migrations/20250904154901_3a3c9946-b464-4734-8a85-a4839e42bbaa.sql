-- إزالة إنشاء الإشعارات من جميع المواقع عند الموافقة على الكتب
-- لمنع ظهور رسالة "تم قبول كتابك ✅" نهائياً

-- 1. إزالة أي تريغرات متبقية لإنشاء الإشعارات
DROP TRIGGER IF EXISTS book_status_notification_trigger ON book_submissions;
DROP TRIGGER IF EXISTS book_status_change_email_trigger ON book_submissions;

-- 2. إزالة أي دوال متبقية لإنشاء الإشعارات عند تغيير حالة الكتاب
DROP FUNCTION IF EXISTS public.notify_book_status_change() CASCADE;
DROP FUNCTION IF EXISTS public.handle_book_status_change_with_email() CASCADE;

-- 3. حذف جميع الإشعارات الموجودة التي تحتوي على نص "تم قبول كتابك" أو "مبروك"
DELETE FROM public.notifications 
WHERE (
  title LIKE '%تم قبول كتابك%' 
  OR title LIKE '%تمت الموافقة على كتابك%'
  OR message LIKE '%مبروك%تم قبول كتاب%'
  OR message LIKE '%ونشره بنجاح%'
  OR message LIKE '%يمكن للقراء الآن الوصول إليه%'
);

-- 4. إنشاء دالة بديلة فارغة لضمان عدم إنشاء أي إشعارات في المستقبل
CREATE OR REPLACE FUNCTION public.prevent_book_approval_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- لا نفعل شيئاً - فقط نعيد السطر الجديد دون إنشاء إشعارات
  RETURN NEW;
END;
$$;