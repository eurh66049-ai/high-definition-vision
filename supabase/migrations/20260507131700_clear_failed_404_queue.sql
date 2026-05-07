-- مسح الكتب الفاشلة من الطابور (روابط PDF خاطئة كانت تُخمَّن من المُعرّف)
DELETE FROM public.bulk_upload_queue
WHERE status = 'failed' AND error IN ('HTTP 404', 'HTTP 500', 'HTTP 546');
