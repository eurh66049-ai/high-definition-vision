CREATE OR REPLACE FUNCTION public.bulk_upload_queue_stats_by_batch()
RETURNS TABLE(
  batch_label text,
  status text,
  count bigint,
  first_created_at timestamptz,
  last_updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(batch_label, 'غير مسماة') AS batch_label,
    status,
    count(*)::bigint AS count,
    min(created_at) AS first_created_at,
    max(updated_at) AS last_updated_at
  FROM public.bulk_upload_queue
  GROUP BY COALESCE(batch_label, 'غير مسماة'), status;
$$;