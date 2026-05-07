-- Remove duplicate endpoints, keeping the most recent one
DELETE FROM public.push_subscriptions a
USING public.push_subscriptions b
WHERE a.endpoint = b.endpoint
  AND a.created_at < b.created_at;

-- Now add unique constraint on endpoint
ALTER TABLE public.push_subscriptions ADD CONSTRAINT push_subscriptions_endpoint_key UNIQUE (endpoint);

-- Create function to trigger push notification
CREATE OR REPLACE FUNCTION public.trigger_push_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  push_payload jsonb;
BEGIN
  -- Build the notification payload
  push_payload := jsonb_build_object(
    'userId', NEW.user_id,
    'title', NEW.title,
    'body', NEW.message,
    'url', '/',
    'tag', 'notification-' || NEW.id
  );
  
  -- Call the edge function asynchronously using pg_net
  PERFORM net.http_post(
    url := 'https://kydmyxsgyxeubhmqzrgo.supabase.co/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := push_payload
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block notification creation
    RAISE WARNING 'Push notification trigger error: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_notification_created ON public.notifications;

-- Create trigger for new notifications
CREATE TRIGGER on_notification_created
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_push_notification();