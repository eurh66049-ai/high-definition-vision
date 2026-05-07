-- Fix conflicting signature for update_user_last_seen and create trigger
DROP FUNCTION IF EXISTS public.update_user_last_seen(uuid);

CREATE OR REPLACE FUNCTION public.update_user_last_seen(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  rows_updated integer := 0;
BEGIN
  UPDATE public.profiles
  SET last_seen = NOW()
  WHERE id = p_user_id AND auth.uid() = p_user_id;

  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated > 0;
END;
$$;

-- Trigger to update conversations.last_message_at on new messages
CREATE OR REPLACE FUNCTION public.update_conversation_last_message_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.created_at, updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_conversation_last_message_at ON public.messages;
CREATE TRIGGER trg_update_conversation_last_message_at
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_conversation_last_message_at();