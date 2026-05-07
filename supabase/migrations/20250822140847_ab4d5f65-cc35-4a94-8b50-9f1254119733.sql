-- إزالة جميع الدوال والتريغرات التي تُرسل إشعارات تلقائية عند تحديث حالة الكتاب
-- لأن Edge Function يتولى هذا الأمر بالكامل

-- حذف التريغر إذا كان موجوداً
DROP TRIGGER IF EXISTS book_status_change_email_trigger ON book_submissions;

-- حذف الدالة المسببة للإشعارات المكررة
DROP FUNCTION IF EXISTS public.handle_book_status_change_with_email() CASCADE;

-- حذف أي تريغرات أخرى متعلقة بإرسال الإشعارات
DROP TRIGGER IF EXISTS book_status_notification_trigger ON book_submissions;

-- تنظيف الإشعارات المكررة للكتاب المحدد
DELETE FROM public.notifications 
WHERE book_submission_id = '5e4b44f2-fd09-4cc9-912a-c08a048a1a1e'
  AND type = 'success'
  AND created_at > '2025-08-22 14:00:00';