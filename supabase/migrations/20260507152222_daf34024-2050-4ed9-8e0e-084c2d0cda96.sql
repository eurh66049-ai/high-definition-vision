DELETE FROM public.bulk_upload_queue;
UPDATE public.auto_discover_config
SET cursor = NULL,
    total_discovered = 0,
    last_status = 'تم تفريغ الطابور وإعادة البدء',
    last_error = NULL
WHERE id = 1;