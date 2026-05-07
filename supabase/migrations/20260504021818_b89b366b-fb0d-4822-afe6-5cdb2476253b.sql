CREATE OR REPLACE FUNCTION public.claim_bulk_upload_items(p_limit integer DEFAULT 10)
RETURNS SETOF public.bulk_upload_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_limit integer := GREATEST(1, COALESCE(p_limit, 10));
BEGIN
  RETURN QUERY
  WITH active_counts AS (
    SELECT
      COALESCE(batch_label, 'غير مسماة') AS batch_key,
      count(*)::integer AS active_count
    FROM public.bulk_upload_queue
    WHERE status = 'processing'
      AND started_at >= now() - interval '10 minutes'
    GROUP BY COALESCE(batch_label, 'غير مسماة')
  ),
  eligible AS (
    SELECT
      q.id,
      COALESCE(q.batch_label, 'غير مسماة') AS batch_key,
      q.created_at,
      row_number() OVER (
        PARTITION BY COALESCE(q.batch_label, 'غير مسماة')
        ORDER BY q.created_at ASC
      ) AS rn,
      GREATEST(0, v_limit - COALESCE(ac.active_count, 0)) AS available_slots
    FROM public.bulk_upload_queue q
    LEFT JOIN active_counts ac
      ON ac.batch_key = COALESCE(q.batch_label, 'غير مسماة')
    WHERE q.status = 'pending'
       OR (q.status = 'processing' AND q.started_at < now() - interval '10 minutes')
  ),
  picked AS (
    SELECT q.id
    FROM public.bulk_upload_queue q
    JOIN eligible e ON e.id = q.id
    WHERE e.rn <= e.available_slots
    ORDER BY e.batch_key ASC, e.created_at ASC
    FOR UPDATE OF q SKIP LOCKED
  )
  UPDATE public.bulk_upload_queue q
     SET status = 'processing',
         started_at = now(),
         attempts = q.attempts + 1,
         updated_at = now()
    FROM picked
   WHERE q.id = picked.id
  RETURNING q.*;
END;
$function$;