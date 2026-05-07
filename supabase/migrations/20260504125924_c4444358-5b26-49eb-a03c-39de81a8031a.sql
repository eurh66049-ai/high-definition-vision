-- إعادة الكتب العالقة في الطابور إلى pending لتُعالج بالنظام الجديد
UPDATE public.bulk_upload_queue
SET status = 'pending',
    started_at = NULL,
    finished_at = NULL,
    attempts = 0,
    error = NULL
WHERE status IN ('processing', 'failed');