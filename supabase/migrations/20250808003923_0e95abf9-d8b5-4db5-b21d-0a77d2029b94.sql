-- Create database functions for messaging system if they don't exist

-- Function to get or create conversation between two users
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(
  p_user1_id UUID,
  p_user2_id UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_conversation_id UUID;
  v_existing_conversation UUID;
BEGIN
  -- Check if conversation already exists
  SELECT id INTO v_existing_conversation
  FROM public.conversations
  WHERE (participant_1 = p_user1_id AND participant_2 = p_user2_id)
     OR (participant_1 = p_user2_id AND participant_2 = p_user1_id);
  
  IF v_existing_conversation IS NOT NULL THEN
    RETURN v_existing_conversation;
  END IF;
  
  -- Create new conversation
  INSERT INTO public.conversations (participant_1, participant_2)
  VALUES (p_user1_id, p_user2_id)
  RETURNING id INTO v_conversation_id;
  
  RETURN v_conversation_id;
END;
$$;

-- Function to get user conversations with participant details
CREATE OR REPLACE FUNCTION public.get_user_conversations(p_user_id UUID)
RETURNS TABLE(
  conversation_id UUID,
  participant_id UUID,
  participant_username TEXT,
  participant_avatar_url TEXT,
  participant_email TEXT,
  last_message TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  unread_count INTEGER,
  is_online BOOLEAN
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
    p.email as participant_email,
    m.content as last_message,
    m.created_at as last_message_at,
    COALESCE(unread.count, 0)::INTEGER as unread_count,
    FALSE as is_online
  FROM public.conversations c
  LEFT JOIN public.profiles p ON p.id = CASE 
    WHEN c.participant_1 = p_user_id THEN c.participant_2
    ELSE c.participant_1
  END
  LEFT JOIN LATERAL (
    SELECT content, created_at
    FROM public.messages
    WHERE conversation_id = c.id
      AND deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1
  ) m ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::INTEGER as count
    FROM public.messages
    WHERE conversation_id = c.id
      AND receiver_id = p_user_id
      AND is_read = FALSE
      AND deleted_at IS NULL
  ) unread ON true
  WHERE c.participant_1 = p_user_id OR c.participant_2 = p_user_id
  ORDER BY COALESCE(m.created_at, c.created_at) DESC;
END;
$$;

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION public.mark_messages_as_read(
  p_conversation_id UUID,
  p_user_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.messages
  SET is_read = TRUE
  WHERE conversation_id = p_conversation_id
    AND receiver_id = p_user_id
    AND is_read = FALSE
    AND deleted_at IS NULL;
END;
$$;