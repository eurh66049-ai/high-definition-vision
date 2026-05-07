-- حذف التريجر المكرر الذي يسبب إشعارين عند الموافقة على الكتاب
-- نحتفظ بـ handle_book_status_change_with_html لأنه الأحدث ويتضمن book_author و book_category
DROP TRIGGER IF EXISTS book_status_notification_trigger ON public.book_submissions;
DROP FUNCTION IF EXISTS notify_book_status_change();