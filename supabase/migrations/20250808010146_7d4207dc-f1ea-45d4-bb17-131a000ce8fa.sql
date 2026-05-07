-- إنشاء دالة لجلب بيانات المحادثات مع معلومات المستخدمين كاملة
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
  WITH conversation_data AS (
    SELECT 
      c.id as conv_id,
      CASE 
        WHEN c.participant_1 = p_user_id THEN c.participant_2
        ELSE c.participant_1
      END as other_participant_id,
      c.last_message_at,
      c.updated_at
    FROM public.conversations c
    WHERE c.participant_1 = p_user_id OR c.participant_2 = p_user_id
      AND c.is_active = true
  ),
  last_messages AS (
    SELECT DISTINCT ON (m.conversation_id)
      m.conversation_id,
      m.content as last_msg,
      m.created_at as last_msg_time
    FROM public.messages m
    WHERE m.conversation_id IN (SELECT conv_id FROM conversation_data)
      AND m.deleted_at IS NULL
    ORDER BY m.conversation_id, m.created_at DESC
  ),
  unread_counts AS (
    SELECT 
      m.conversation_id,
      COUNT(*) as unread_cnt
    FROM public.messages m
    WHERE m.conversation_id IN (SELECT conv_id FROM conversation_data)
      AND m.receiver_id = p_user_id
      AND m.is_read = false
      AND m.deleted_at IS NULL
    GROUP BY m.conversation_id
  )
  SELECT 
    cd.conv_id,
    cd.other_participant_id,
    COALESCE(p.username, p.email, 'مستخدم مجهول') as participant_username,
    p.avatar_url as participant_avatar_url,
    p.email as participant_email,
    lm.last_msg,
    lm.last_msg_time,
    COALESCE(uc.unread_cnt, 0) as unread_count,
    false as is_online -- يمكن تطوير هذا لاحقاً
  FROM conversation_data cd
  LEFT JOIN public.profiles p ON cd.other_participant_id = p.id
  LEFT JOIN last_messages lm ON cd.conv_id = lm.conversation_id  
  LEFT JOIN unread_counts uc ON cd.conv_id = uc.conversation_id
  ORDER BY COALESCE(lm.last_msg_time, cd.updated_at) DESC;
END;
$$;