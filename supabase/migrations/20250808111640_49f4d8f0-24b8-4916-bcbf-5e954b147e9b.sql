-- Fix conflicting signature for mark_messages_as_read
DROP FUNCTION IF EXISTS public.mark_messages_as_read(uuid, uuid);

CREATE OR REPLACE FUNCTION public.mark_messages_as_read(p_conversation_id uuid, p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_updated integer := 0;
BEGIN
  -- Ensure caller is the same as p_user_id
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Ensure user is a participant in the conversation
  IF NOT EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = p_conversation_id
      AND (c.participant_1 = p_user_id OR c.participant_2 = p_user_id)
  ) THEN
    RAISE EXCEPTION 'Conversation not found or access denied';
  END IF;

  UPDATE public.messages
  SET is_read = true, updated_at = NOW()
  WHERE conversation_id = p_conversation_id
    AND receiver_id = p_user_id
    AND is_read = false
    AND deleted_at IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;