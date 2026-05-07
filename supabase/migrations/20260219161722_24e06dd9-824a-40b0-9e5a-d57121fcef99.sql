-- حذف التريجر المكرر الذي يسبب إشعارين
DROP TRIGGER IF EXISTS book_submission_status_change_trigger ON public.book_submissions;
DROP FUNCTION IF EXISTS handle_book_submission_status_change();