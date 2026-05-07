
-- Drop triggers that use direct SQL deletion from storage.objects (which is blocked)
-- The edge function already handles file cleanup via Storage API

DROP TRIGGER IF EXISTS auto_cleanup_rejected_files_trigger ON public.book_submissions;
DROP TRIGGER IF EXISTS safe_cleanup_rejected_book_files_trigger ON public.book_submissions;
DROP TRIGGER IF EXISTS trg_cleanup_files_on_reject ON public.book_submissions;
DROP TRIGGER IF EXISTS trigger_cleanup_user_book_files ON public.book_submissions;

-- Drop the functions too
DROP FUNCTION IF EXISTS auto_cleanup_rejected_book_files();
DROP FUNCTION IF EXISTS safe_cleanup_rejected_book_files();
DROP FUNCTION IF EXISTS cleanup_rejected_book_files();
DROP FUNCTION IF EXISTS cleanup_user_book_files();
DROP FUNCTION IF EXISTS cleanup_failed_submission_files(TEXT, TEXT, TEXT, TEXT);
