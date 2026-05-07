CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- إلغاء أي جدولة سابقة بنفس الاسم (للأمان)
DO $$
BEGIN
  PERFORM cron.unschedule('ai-bots-review-books-hourly');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- جدولة تشغيل البوتات كل ساعة
SELECT cron.schedule(
  'ai-bots-review-books-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://kydmyxsgyxeubhmqzrgo.supabase.co/functions/v1/ai-bots-review-books',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5ZG15eHNneXhldWJobXF6cmdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0ODQ3NjQsImV4cCI6MjA2MjA2MDc2NH0.b-ckDfOmmf2x__FG5Snm9px8j4pqPke5Ra1RgoGEqP0"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);