-- إنشاء دالة لجلب الرسائل مع معلومات المرسل
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
    COALESCE(sender_profile.username, sender_profile.email, 'مستخدم مجهول') as sender_username,
    sender_profile.avatar_url as sender_avatar_url,
    sender_profile.email as sender_email,
    COALESCE(receiver_profile.username, receiver_profile.email, 'مستخدم مجهول') as receiver_username,
    receiver_profile.avatar_url as receiver_avatar_url,
    receiver_profile.email as receiver_email
  FROM public.messages m
  LEFT JOIN public.profiles sender_profile ON m.sender_id = sender_profile.id
  LEFT JOIN public.profiles receiver_profile ON m.receiver_id = receiver_profile.id
  WHERE m.conversation_id = p_conversation_id
    AND m.deleted_at IS NULL
  ORDER BY m.created_at ASC;
END;
$$;