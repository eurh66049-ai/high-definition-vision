-- Create trigger to auto-delete files when a submission is rejected
-- It uses the existing function public.cleanup_rejected_book_files()

-- Safety: drop existing trigger if present to avoid duplicates
DROP TRIGGER IF EXISTS trg_cleanup_files_on_reject ON public.book_submissions;

-- Create the trigger on status updates only
CREATE TRIGGER trg_cleanup_files_on_reject
AFTER UPDATE OF status ON public.book_submissions
FOR EACH ROW
WHEN (NEW.status = 'rejected' AND COALESCE(OLD.status, '') <> 'rejected')
EXECUTE FUNCTION public.cleanup_rejected_book_files();
