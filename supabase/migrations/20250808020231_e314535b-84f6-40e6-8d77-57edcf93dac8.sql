-- إنشاء trigger لتحديث آخر نشاط عند إرسال رسالة
CREATE OR REPLACE FUNCTION public.update_sender_last_seen()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $$
BEGIN
  -- تحديث آخر نشاط للمرسل
  UPDATE public.profiles 
  SET last_seen = now()
  WHERE id = NEW.sender_id;
  
  RETURN NEW;
END;
$$;

-- إنشاء trigger على جدول messages
DROP TRIGGER IF EXISTS trigger_update_sender_last_seen ON public.messages;
CREATE TRIGGER trigger_update_sender_last_seen
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_sender_last_seen();

-- دالة لتحديث آخر نشاط عند قراءة الرسائل
CREATE OR REPLACE FUNCTION public.mark_messages_as_read(p_conversation_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $$
BEGIN
  -- علامة الرسائل كمقروءة
  UPDATE public.messages
  SET is_read = true
  WHERE conversation_id = p_conversation_id
    AND receiver_id = p_user_id
    AND is_read = false;
    
  -- تحديث آخر نشاط للمستخدم
  UPDATE public.profiles 
  SET last_seen = now()
  WHERE id = p_user_id;
END;
$$;

-- دالة للحصول على رسائل المحادثة مع تحديث آخر نشاط
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
SECURITY DEFINER SET search_path = 'public'
AS $$
BEGIN
  -- تحديث آخر نشاط للمستخدم الحالي
  IF auth.uid() IS NOT NULL THEN
    UPDATE public.profiles 
    SET last_seen = now()
    WHERE id = auth.uid();
  END IF;

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
    sender_profile.username as sender_username,
    sender_profile.avatar_url as sender_avatar_url,
    sender_profile.email as sender_email,
    receiver_profile.username as receiver_username,
    receiver_profile.avatar_url as receiver_avatar_url,
    receiver_profile.email as receiver_email
  FROM public.messages m
  LEFT JOIN public.profiles sender_profile ON m.sender_id = sender_profile.id
  LEFT JOIN public.profiles receiver_profile ON m.receiver_id = receiver_profile.id
  WHERE m.conversation_id = p_conversation_id
    AND m.deleted_at IS NULL
    AND (
      m.sender_id = auth.uid() OR 
      m.receiver_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.conversations c 
        WHERE c.id = p_conversation_id 
        AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
      )
    )
  ORDER BY m.created_at ASC;
END;
$$;