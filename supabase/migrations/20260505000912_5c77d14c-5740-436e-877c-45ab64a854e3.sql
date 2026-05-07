
SELECT cron.schedule(
  'process-text-extraction-queue-every-2-min',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url:='https://kydmyxsgyxeubhmqzrgo.supabase.co/functions/v1/process-text-extraction-queue',
    headers:='{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5ZG15eHNneXhldWJobXF6cmdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0ODQ3NjQsImV4cCI6MjA2MjA2MDc2NH0.b-ckDfOmmf2x__FG5Snm9px8j4pqPke5Ra1RgoGEqP0"}'::jsonb,
    body:=concat('{"time": "', now(), '"}')::jsonb
  );
  $$
);
