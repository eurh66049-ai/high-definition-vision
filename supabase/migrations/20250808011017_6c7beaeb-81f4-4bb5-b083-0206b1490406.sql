-- إنشاء دالة للحصول على محادثات المستخدم مع بيانات المشاركين
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
  is_online boolean
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
    COALESCE(p.username, p.email, 'مستخدم مجهول') as participant_username,
    p.avatar_url as participant_avatar_url,
    COALESCE(p.email, '') as participant_email,
    (
      SELECT m.content
      FROM public.messages m
      WHERE m.conversation_id = c.id
        AND m.deleted_at IS NULL
      ORDER BY m.created_at DESC
      LIMIT 1
    ) as last_message,
    c.last_message_at,
    (
      SELECT COUNT(*)::bigint
      FROM public.messages m
      WHERE m.conversation_id = c.id
        AND m.receiver_id = p_user_id
        AND m.is_read = false
        AND m.deleted_at IS NULL
    ) as unread_count,
    false as is_online -- يمكن تطويرها لاحقاً
  FROM public.conversations c
  LEFT JOIN public.profiles p ON p.id = CASE 
    WHEN c.participant_1 = p_user_id THEN c.participant_2
    ELSE c.participant_1
  END
  WHERE (c.participant_1 = p_user_id OR c.participant_2 = p_user_id)
    AND c.is_active = true
  ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC;
END;
$$;

-- إنشاء دالة للحصول على رسائل محادثة معينة مع بيانات المرسلين
CREATE OR REPLACE FUNCTION public.get_conversation_messages(p_conversation_id uuid)
RETURNS TABLE(
  id uuid,
  conversation_id uuid,
  sender_id uuid,
  receiver_id uuid,
  content text,
  message_type text,
  is_read boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  edited_at timestamp with time zone,
  deleted_at timestamp with time zone,
  sender_username text,
  sender_avatar_url text,
  sender_email text,
  receiver_username text,
  receiver_avatar_url text,
  receiver_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.conversation_id,
    m.sender_id,
    m.receiver_id,
    m.content,
    m.message_type,
    m.is_read,
    m.created_at,
    m.updated_at,
    m.edited_at,
    m.deleted_at,
    COALESCE(sender_p.username, sender_p.email, 'مستخدم مجهول') as sender_username,
    sender_p.avatar_url as sender_avatar_url,
    COALESCE(sender_p.email, '') as sender_email,
    COALESCE(receiver_p.username, receiver_p.email, 'مستخدم مجهول') as receiver_username,
    receiver_p.avatar_url as receiver_avatar_url,
    COALESCE(receiver_p.email, '') as receiver_email
  FROM public.messages m
  LEFT JOIN public.profiles sender_p ON sender_p.id = m.sender_id
  LEFT JOIN public.profiles receiver_p ON receiver_p.id = m.receiver_id
  WHERE m.conversation_id = p_conversation_id
    AND m.deleted_at IS NULL
  ORDER BY m.created_at ASC;
END;
$$;