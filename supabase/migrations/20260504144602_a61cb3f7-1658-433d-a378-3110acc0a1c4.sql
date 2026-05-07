CREATE OR REPLACE FUNCTION public.claim_bulk_upload_items(p_limit integer DEFAULT 6)
RETURNS SETOF public.bulk_upload_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_limit integer := GREATEST(1, COALESCE(p_limit, 6));
BEGIN
  RETURN QUERY
  WITH reset_stale AS (
    UPDATE public.bulk_upload_queue q
       SET status = 'pending',
           started_at = NULL,
           updated_at = now()
     WHERE q.status = 'processing'
       AND q.started_at < now() - interval '10 minutes'
     RETURNING q.id
  ),
  ranked AS (
    SELECT id
    FROM (
      SELECT
        q.id,
        q.created_at,
        row_number() OVER (
          PARTITION BY COALESCE(q.batch_label, 'غير مسماة')
          ORDER BY q.created_at ASC
        ) AS batch_rank
      FROM public.bulk_upload_queue q
      WHERE q.status = 'pending'
    ) pending_items
    ORDER BY batch_rank ASC, created_at ASC
    LIMIT v_limit
  ),
  picked AS (
    SELECT q.id
    FROM public.bulk_upload_queue q
    JOIN ranked r ON r.id = q.id
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