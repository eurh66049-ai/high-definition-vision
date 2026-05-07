-- إنشاء دالة محدثة لجلب المحادثات مع تحويل avatar URLs
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
  WITH conversation_data AS (
    SELECT 
      c.id as conversation_id,
      CASE 
        WHEN c.participant_1 = p_user_id THEN c.participant_2 
        ELSE c.participant_1 
      END as other_participant_id,
      c.last_message_at
    FROM public.conversations c
    WHERE c.participant_1 = p_user_id OR c.participant_2 = p_user_id
  ),
  last_messages AS (
    SELECT DISTINCT ON (m.conversation_id)
      m.conversation_id,
      m.content as last_message
    FROM public.messages m
    INNER JOIN conversation_data cd ON m.conversation_id = cd.conversation_id
    WHERE m.deleted_at IS NULL
    ORDER BY m.conversation_id, m.created_at DESC
  ),
  unread_counts AS (
    SELECT 
      m.conversation_id,
      COUNT(*) as unread_count
    FROM public.messages m
    INNER JOIN conversation_data cd ON m.conversation_id = cd.conversation_id
    WHERE m.receiver_id = p_user_id 
      AND m.is_read = false 
      AND m.deleted_at IS NULL
    GROUP BY m.conversation_id
  ),
  online_status AS (
    SELECT 
      p.id,
      CASE 
        WHEN p.last_seen > NOW() - INTERVAL '5 minutes' THEN true
        ELSE false
      END as is_online
    FROM public.profiles p
  )
  SELECT 
    cd.conversation_id,
    cd.other_participant_id as participant_id,
    COALESCE(p.username, p.email, 'مستخدم مجهول') as participant_username,
    CASE 
      WHEN p.avatar_url IS NOT NULL AND p.avatar_url !~ '^https?://' THEN
        'https://kydmyxsgyxeubhmqzrgo.supabase.co/storage/v1/object/public/avatars/' || p.avatar_url
      ELSE
        p.avatar_url
    END as participant_avatar_url,
    p.email as participant_email,
    lm.last_message,
    cd.last_message_at,
    COALESCE(uc.unread_count, 0) as unread_count,
    COALESCE(os.is_online, false) as is_online,
    p.last_seen
  FROM conversation_data cd
  LEFT JOIN public.profiles p ON p.id = cd.other_participant_id
  LEFT JOIN last_messages lm ON lm.conversation_id = cd.conversation_id
  LEFT JOIN unread_counts uc ON uc.conversation_id = cd.conversation_id
  LEFT JOIN online_status os ON os.id = cd.other_participant_id
  ORDER BY cd.last_message_at DESC NULLS LAST;
END;
$$;