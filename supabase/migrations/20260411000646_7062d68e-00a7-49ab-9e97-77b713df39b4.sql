-- Drop the old trigger and function that uses pg_net (unreliable)
DROP TRIGGER IF EXISTS on_new_notification_send_push ON public.notifications;
DROP FUNCTION IF EXISTS public.notify_onesignal_on_new_notification();

-- Create a simpler approach: a function that can be called via supabase.rpc()
CREATE OR REPLACE FUNCTION public.send_push_notification(
  p_user_id uuid,
  p_title text,
  p_message text,
  p_target_url text DEFAULT '',
  p_type text DEFAULT 'general'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This function exists as a placeholder. 
  -- Push notifications are sent via the Edge Function called from the client.
  -- This keeps the architecture simple and reliable.
  NULL;
END;
$$;