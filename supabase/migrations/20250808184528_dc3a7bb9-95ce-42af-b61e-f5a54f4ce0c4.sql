-- التحقق من وجود دالة get_user_conversations وإنشاءها إذا لم تكن موجودة
CREATE OR REPLACE FUNCTION public.get_user_conversations(p_user_id uuid)
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
  WITH conversation_participants AS (
    SELECT 
      c.id as conv_id,
      CASE 
        WHEN c.participant_1 = p_user_id THEN c.participant_2
        ELSE c.participant_1
      END as other_participant_id,
      c.last_message_at,
      c.updated_at
    FROM conversations c
    WHERE (c.participant_1 = p_user_id OR c.participant_2 = p_user_id)
      AND c.is_active = true
  ),
  last_messages AS (
    SELECT DISTINCT ON (m.conversation_id)
      m.conversation_id,
      m.content as last_message,
      m.created_at as last_message_at
    FROM messages m
    INNER JOIN conversation_participants cp ON m.conversation_id = cp.conv_id
    WHERE m.deleted_at IS NULL
    ORDER BY m.conversation_id, m.created_at DESC
  ),
  unread_counts AS (
    SELECT 
      m.conversation_id,
      COUNT(*) as unread_count
    FROM messages m
    INNER JOIN conversation_participants cp ON m.conversation_id = cp.conv_id
    WHERE m.receiver_id = p_user_id 
      AND m.is_read = false 
      AND m.deleted_at IS NULL
    GROUP BY m.conversation_id
  )
  SELECT 
    cp.conv_id as conversation_id,
    cp.other_participant_id as participant_id,
    COALESCE(p.username, p.email, a.name, 'مستخدم مجهول') as participant_username,
    COALESCE(p.avatar_url, a.avatar_url) as participant_avatar_url,
    COALESCE(p.email, '') as participant_email,
    lm.last_message,
    COALESCE(lm.last_message_at, cp.last_message_at) as last_message_at,
    COALESCE(uc.unread_count, 0) as unread_count,
    CASE 
      WHEN p.last_seen IS NOT NULL AND p.last_seen > (NOW() - INTERVAL '5 minutes') THEN true
      ELSE false
    END as is_online,
    p.last_seen
  FROM conversation_participants cp
  LEFT JOIN profiles p ON p.id = cp.other_participant_id
  LEFT JOIN authors a ON a.user_id = cp.other_participant_id
  LEFT JOIN last_messages lm ON lm.conversation_id = cp.conv_id
  LEFT JOIN unread_counts uc ON uc.conversation_id = cp.conv_id
  ORDER BY COALESCE(lm.last_message_at, cp.last_message_at, cp.updated_at) DESC;
END;
$$;

-- دالة لتحديث آخر نشاط للمستخدم
CREATE OR REPLACE FUNCTION public.update_user_last_seen(p_user_id uuid)
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

-- دالة للحصول على محادثة أو إنشاءها
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(p_user1_id uuid, p_user2_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  conversation_id uuid;
BEGIN
  -- البحث عن محادثة موجودة
  SELECT id INTO conversation_id
  FROM conversations
  WHERE (participant_1 = p_user1_id AND participant_2 = p_user2_id)
     OR (participant_1 = p_user2_id AND participant_2 = p_user1_id);
  
  -- إنشاء محادثة جديدة إذا لم توجد
  IF conversation_id IS NULL THEN
    INSERT INTO conversations (participant_1, participant_2)
    VALUES (p_user1_id, p_user2_id)
    RETURNING id INTO conversation_id;
  END IF;
  
  RETURN conversation_id;
END;
$$;