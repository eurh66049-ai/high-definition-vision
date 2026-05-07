
UPDATE public.book_submissions
SET title = trim(regexp_replace(regexp_replace(title, '[-_]', ' ', 'g'), '\s+', ' ', 'g'))
WHERE title ~ '[-_]';

CREATE TABLE IF NOT EXISTS public.text_extraction_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_text_extraction_queue_status ON public.text_extraction_queue(status, created_at);

ALTER TABLE public.text_extraction_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage text_extraction_queue"
ON public.text_extraction_queue
FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.user_id = auth.uid() AND a.is_active = true))
WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.user_id = auth.uid() AND a.is_active = true));

INSERT INTO public.text_extraction_queue (book_id, status)
SELECT bs.id, 'pending'
FROM public.book_submissions bs
WHERE bs.status = 'approved'
  AND bs.book_file_url IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.book_extracted_text bet
    WHERE bet.book_id = bs.id
      AND bet.extraction_status = 'completed'
      AND COALESCE(bet.text_length, 0) > 0
  )
ON CONFLICT (book_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.claim_text_extraction_items(p_limit INT DEFAULT 3)
RETURNS TABLE(id UUID, book_id UUID, attempts INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.text_extraction_queue
  SET status = 'pending', started_at = NULL
  WHERE status = 'processing'
    AND started_at < now() - interval '15 minutes';

  RETURN QUERY
  WITH picked AS (
    SELECT q.id
    FROM public.text_extraction_queue q
    WHERE q.status = 'pending'
      AND q.attempts < 5
    ORDER BY q.created_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.text_extraction_queue q
  SET status = 'processing',
      started_at = now(),
      attempts = q.attempts + 1,
      updated_at = now()
  FROM picked
  WHERE q.id = picked.id
  RETURNING q.id, q.book_id, q.attempts;
END;
$$;

CREATE TRIGGER update_text_extraction_queue_updated_at
BEFORE UPDATE ON public.text_extraction_queue
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
