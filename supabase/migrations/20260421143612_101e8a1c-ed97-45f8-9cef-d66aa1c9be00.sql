-- Schedule AI quote generation 3 times per day
SELECT cron.unschedule('ai-generate-quotes-thrice-daily')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ai-generate-quotes-thrice-daily');

SELECT cron.schedule(
  'ai-generate-quotes-thrice-daily',
  '0 8,14,20 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kydmyxsgyxeubhmqzrgo.supabase.co/functions/v1/generate-ai-quotes',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5ZG15eHNneXhldWJobXF6cmdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0ODQ3NjQsImV4cCI6MjA2MjA2MDc2NH0.b-ckDfOmmf2x__FG5Snm9px8j4pqPke5Ra1RgoGEqP0"}'::jsonb,
    body := '{"limit": 5}'::jsonb
  );
  $$
);