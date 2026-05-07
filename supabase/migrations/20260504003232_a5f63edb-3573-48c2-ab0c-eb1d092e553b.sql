
CREATE TABLE IF NOT EXISTS public.bulk_upload_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  book_file_url text NOT NULL,
  cover_image_url text,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 4,
  error text,
  result_book_id uuid,
  page_count integer,
  created_by uuid,
  created_by_email text,
  batch_label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_bulk_upload_queue_status_created
  ON public.bulk_upload_queue(status, created_at);

CREATE INDEX IF NOT EXISTS idx_bulk_upload_queue_batch
  ON public.bulk_upload_queue(batch_label, created_at);

CREATE OR REPLACE FUNCTION public.update_bulk_upload_queue_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bulk_upload_queue_updated_at ON public.bulk_upload_queue;
CREATE TRIGGER trg_bulk_upload_queue_updated_at
  BEFORE UPDATE ON public.bulk_upload_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_bulk_upload_queue_updated_at();

ALTER TABLE public.bulk_upload_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage bulk upload queue" ON public.bulk_upload_queue;
CREATE POLICY "Admins manage bulk upload queue"
  ON public.bulk_upload_queue
  FOR ALL
  TO authenticated
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

CREATE OR REPLACE FUNCTION public.claim_bulk_upload_items(p_limit integer DEFAULT 3)
RETURNS SETOF public.bulk_upload_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH picked AS (
    SELECT id
    FROM public.bulk_upload_queue
    WHERE status = 'pending'
       OR (status = 'processing' AND started_at < now() - interval '10 minutes')
    ORDER BY created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT GREATEST(1, COALESCE(p_limit, 3))
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
$$;

CREATE OR REPLACE FUNCTION public.bulk_upload_queue_stats()
RETURNS TABLE(status text, count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT status, count(*)::bigint
  FROM public.bulk_upload_queue
  GROUP BY status;
$$;
