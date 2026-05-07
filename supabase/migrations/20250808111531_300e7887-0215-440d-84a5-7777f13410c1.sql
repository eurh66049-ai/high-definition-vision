-- Messaging RPCs and trigger to support the app hooks

-- 1) Get or create conversation between two users
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(p_user1_id uuid, p_user2_id uuid)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_conversation_id uuid;
BEGIN
  IF p_user1_id IS NULL OR p_user2_id IS NULL OR p_user1_id = p_user2_id THEN
    RAISE EXCEPTION 'Invalid participants';
  END IF;

  SELECT id INTO v_conversation_id
  FROM public.conversations c
  WHERE (c.participant_1 = p_user1_id AND c.participant_2 = p_user2_id)
     OR (c.participant_1 = p_user2_id AND c.participant_2 = p_user1_id)
  LIMIT 1;

  IF v_conversation_id IS NULL THEN
    INSERT INTO public.conversations (participant_1, participant_2, is_active)
    VALUES (p_user1_id, p_user2_id, true)
    RETURNING id INTO v_conversation_id;
  END IF;

  RETURN v_conversation_id;
END;
$$;

-- 2) List user's conversations with participant + last message + unread counts
CREATE OR REPLACE FUNCTION public.get_user_conversations(p_user_id uuid)
RETURNS TABLE(
  conversation_id uuid,
  participant_id uuid,
  participant_username text,
  participant_avatar_url text,
  participant_email text,
  last_message text,
  last_message_at timestamptz,
  unread_count integer,
  is_online boolean,
  last_seen timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH user_convs AS (
    SELECT c.id AS conversation_id,
           CASE WHEN c.participant_1 = p_user_id THEN c.participant_2 ELSE c.participant_1 END AS other_id,
           c.last_message_at
    FROM public.conversations c
    WHERE (c.participant_1 = p_user_id OR c.participant_2 = p_user_id)
      AND c.is_active = true
  ),
  last_msgs AS (
    SELECT m.conversation_id,
           m.content AS last_message,
           m.created_at AS last_message_at
    FROM public.messages m
    JOIN (
      SELECT conversation_id, MAX(created_at) AS max_created
      FROM public.messages
      WHERE deleted_at IS NULL
      GROUP BY conversation_id
    ) mm ON mm.conversation_id = m.conversation_id AND mm.max_created = m.created_at
  ),
  unread_counts AS (
    SELECT conversation_id, COUNT(*)::int AS unread_count
    FROM public.messages
    WHERE receiver_id = p_user_id AND is_read = false AND deleted_at IS NULL
    GROUP BY conversation_id
  )
  SELECT 
    uc.conversation_id,
    uc.other_id AS participant_id,
    COALESCE(p.username, p.email, 'مستخدم') AS participant_username,
    p.avatar_url AS participant_avatar_url,
    p.email AS participant_email,
    lm.last_message,
    COALESCE(uc.last_message_at, lm.last_message_at) AS last_message_at,
    COALESCE(ucnt.unread_count, 0) AS unread_count,
    (p.last_seen IS NOT NULL AND p.last_seen > NOW() - INTERVAL '5 minutes') AS is_online,
    p.last_seen
  FROM user_convs uc
  LEFT JOIN public.profiles p ON p.id = uc.other_id
  LEFT JOIN last_msgs lm ON lm.conversation_id = uc.conversation_id
  LEFT JOIN unread_counts ucnt ON ucnt.conversation_id = uc.conversation_id
  ORDER BY COALESCE(uc.last_message_at, lm.last_message_at) DESC NULLS LAST;
END;
$$;

-- 3) Mark messages as read for the receiver (SECURITY DEFINER to bypass RLS update restriction)
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

-- 4) Update current user's last_seen
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

-- 5) Keep conversations.last_message_at up to date when new messages arrive
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