-- إنشاء دالة get_or_create_conversation المفقودة
CREATE OR REPLACE FUNCTION get_or_create_conversation(p_user1_id uuid, p_user2_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_conversation_id uuid;
BEGIN
  -- البحث عن محادثة موجودة
  SELECT id INTO v_conversation_id
  FROM public.conversations
  WHERE (participant_1 = p_user1_id AND participant_2 = p_user2_id)
     OR (participant_1 = p_user2_id AND participant_2 = p_user1_id)
  LIMIT 1;
  
  -- إذا لم توجد محادثة، أنشئ واحدة جديدة
  IF v_conversation_id IS NULL THEN
    INSERT INTO public.conversations (participant_1, participant_2, created_at, updated_at)
    VALUES (p_user1_id, p_user2_id, NOW(), NOW())
    RETURNING id INTO v_conversation_id;
  END IF;
  
  RETURN v_conversation_id;
END;
$$;

-- إنشاء دالة update_user_last_seen المفقودة
CREATE OR REPLACE FUNCTION update_user_last_seen(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET last_seen = NOW()
  WHERE id = p_user_id;
END;
$$;

-- إنشاء دالة get_user_conversations المفقودة
CREATE OR REPLACE FUNCTION get_user_conversations(p_user_id uuid)
RETURNS TABLE(
  conversation_id uuid,
  participant_id uuid,
  participant_username text,
  participant_avatar_url text,
  participant_email text,
  last_message text,
  last_message_at timestamp with time zone,
  unread_count bigint,
  is_online boolean,
  last_seen timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as conversation_id,
    CASE 
      WHEN c.participant_1 = p_user_id THEN c.participant_2
      ELSE c.participant_1
    END as participant_id,
    CASE 
      WHEN c.participant_1 = p_user_id THEN p2.username
      ELSE p1.username
    END as participant_username,
    CASE 
      WHEN c.participant_1 = p_user_id THEN p2.avatar_url
      ELSE p1.avatar_url
    END as participant_avatar_url,
    CASE 
      WHEN c.participant_1 = p_user_id THEN p2.email
      ELSE p1.email
    END as participant_email,
    (
      SELECT m.content 
      FROM public.messages m 
      WHERE m.conversation_id = c.id 
        AND m.deleted_at IS NULL
      ORDER BY m.created_at DESC 
      LIMIT 1
    ) as last_message,
    (
      SELECT m.created_at 
      FROM public.messages m 
      WHERE m.conversation_id = c.id 
        AND m.deleted_at IS NULL
      ORDER BY m.created_at DESC 
      LIMIT 1
    ) as last_message_at,
    COALESCE((
      SELECT COUNT(*)
      FROM public.messages m 
      WHERE m.conversation_id = c.id 
        AND m.receiver_id = p_user_id
        AND m.is_read = false
        AND m.deleted_at IS NULL
    ), 0) as unread_count,
    CASE 
      WHEN c.participant_1 = p_user_id THEN 
        COALESCE(p2.last_seen > (NOW() - INTERVAL '5 minutes'), false)
      ELSE 
        COALESCE(p1.last_seen > (NOW() - INTERVAL '5 minutes'), false)
    END as is_online,
    CASE 
      WHEN c.participant_1 = p_user_id THEN p2.last_seen
      ELSE p1.last_seen
    END as last_seen
  FROM public.conversations c
  LEFT JOIN public.profiles p1 ON c.participant_1 = p1.id
  LEFT JOIN public.profiles p2 ON c.participant_2 = p2.id
  WHERE c.participant_1 = p_user_id OR c.participant_2 = p_user_id
  ORDER BY last_message_at DESC NULLS LAST;
END;
$$;