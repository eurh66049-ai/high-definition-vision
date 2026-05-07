-- Create function to call OneSignal push edge function
CREATE OR REPLACE FUNCTION public.notify_onesignal_on_new_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  edge_function_url text;
  payload jsonb;
BEGIN
  edge_function_url := 'https://kydmyxsgyxeubhmqzrgo.supabase.co/functions/v1/send-onesignal-push';
  
  payload := jsonb_build_object(
    'user_id', NEW.user_id,
    'title', NEW.title,
    'message', NEW.message,
    'target_url', COALESCE(NEW.target_url, ''),
    'type', NEW.type
  );

  PERFORM net.http_post(
    url := edge_function_url,
    body := payload,
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5ZG15eHNneXhldWJobXF6cmdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0ODQ3NjQsImV4cCI6MjA2MjA2MDc2NH0.b-ckDfOmmf2x__FG5Snm9px8j4pqPke5Ra1RgoGEqP0"}'::jsonb
  );

  RETURN NEW;
END;
$$;

-- Create trigger on notifications table
DROP TRIGGER IF EXISTS on_new_notification_send_push ON public.notifications;
CREATE TRIGGER on_new_notification_send_push
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_onesignal_on_new_notification();