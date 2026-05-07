UPDATE public.auto_discover_config
SET search_query = 'mediatype:texts AND language:arabic',
    cursor = NULL,
    last_status = 'تم تحديث الاستعلام، انتظر التشغيل التالي'
WHERE id = 1;