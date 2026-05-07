
CREATE TABLE IF NOT EXISTS public.auto_discover_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  enabled BOOLEAN NOT NULL DEFAULT false,
  search_query TEXT NOT NULL DEFAULT 'language:Arabic AND mediatype:texts AND format:PDF',
  cursor TEXT,
  batch_size INTEGER NOT NULL DEFAULT 100,
  min_pending_threshold INTEGER NOT NULL DEFAULT 100,
  total_discovered INTEGER NOT NULL DEFAULT 0,
  last_run_at TIMESTAMPTZ,
  last_status TEXT,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT auto_discover_config_singleton CHECK (id = 1)
);

INSERT INTO public.auto_discover_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.auto_discover_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view auto discover config" ON public.auto_discover_config;
CREATE POLICY "Admins can view auto discover config"
ON public.auto_discover_config FOR SELECT
USING (public.is_current_user_admin());

DROP POLICY IF EXISTS "Admins can update auto discover config" ON public.auto_discover_config;
CREATE POLICY "Admins can update auto discover config"
ON public.auto_discover_config FOR UPDATE
USING (public.is_current_user_admin());

CREATE OR REPLACE FUNCTION public.update_auto_discover_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS auto_discover_config_updated_at ON public.auto_discover_config;
CREATE TRIGGER auto_discover_config_updated_at
BEFORE UPDATE ON public.auto_discover_config
FOR EACH ROW EXECUTE FUNCTION public.update_auto_discover_config_updated_at();

-- Schedule the auto-discover worker every minute (idempotent)
DO $$
BEGIN
  PERFORM cron.unschedule('auto-discover-archive-books-every-minute');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'auto-discover-archive-books-every-minute',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://kydmyxsgyxeubhmqzrgo.supabase.co/functions/v1/auto-discover-archive-worker',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5ZG15eHNneXhldWJobXF6cmdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0ODQ3NjQsImV4cCI6MjA2MjA2MDc2NH0.b-ckDfOmmf2x__FG5Snm9px8j4pqPke5Ra1RgoGEqP0","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5ZG15eHNneXhldWJobXF6cmdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0ODQ3NjQsImV4cCI6MjA2MjA2MDc2NH0.b-ckDfOmmf2x__FG5Snm9px8j4pqPke5Ra1RgoGEqP0"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
