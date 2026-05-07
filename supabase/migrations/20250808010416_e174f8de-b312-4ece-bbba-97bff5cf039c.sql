-- إنشاء دالة للحصول على محادثة أو إنشاؤها
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(p_user1_id uuid, p_user2_id uuid)
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

-- إنشاء دالة لوضع علامة الرسائل كمقروءة
CREATE OR REPLACE FUNCTION public.mark_messages_as_read(p_conversation_id uuid, p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated_count integer;
BEGIN
  UPDATE public.messages
  SET is_read = true
  WHERE conversation_id = p_conversation_id
    AND receiver_id = p_user_id
    AND is_read = false
    AND deleted_at IS NULL;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  RETURN v_updated_count;
END;
$$;