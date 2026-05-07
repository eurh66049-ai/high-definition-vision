-- Create function to trigger push notification for new messages
CREATE OR REPLACE FUNCTION public.trigger_message_push_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  push_payload jsonb;
  sender_name text;
  receiver_id uuid;
  message_preview text;
BEGIN
  -- Get sender's username
  SELECT username INTO sender_name
  FROM public.profiles
  WHERE id = NEW.sender_id;
  
  -- Get the receiver (the other participant in the conversation)
  SELECT 
    CASE 
      WHEN c.participant_1 = NEW.sender_id THEN c.participant_2
      ELSE c.participant_1
    END INTO receiver_id
  FROM public.conversations c
  WHERE c.id = NEW.conversation_id;
  
  -- Don't notify the sender
  IF receiver_id IS NULL OR receiver_id = NEW.sender_id THEN
    RETURN NEW;
  END IF;
  
  -- Create message preview (first 50 chars)
  message_preview := LEFT(NEW.content, 50);
  IF LENGTH(NEW.content) > 50 THEN
    message_preview := message_preview || '...';
  END IF;
  
  -- Build the notification payload
  push_payload := jsonb_build_object(
    'userId', receiver_id,
    'title', 'رسالة جديدة من ' || COALESCE(sender_name, 'مستخدم'),
    'body', message_preview,
    'url', '/messages?odaUserId=' || NEW.sender_id,
    'tag', 'message-' || NEW.id
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
    -- Log error but don't block message creation
    RAISE WARNING 'Message push notification trigger error: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_message_created ON public.messages;

-- Create trigger for new messages
CREATE TRIGGER on_message_created
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_message_push_notification();