-- إضافة حقل last_seen إلى جدول profiles لتتبع آخر نشاط
ALTER TABLE public.profiles 
ADD COLUMN last_seen timestamp with time zone DEFAULT now();

-- إنشاء دالة لتحديث آخر نشاط للمستخدم
CREATE OR REPLACE FUNCTION public.update_user_last_seen(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles 
  SET last_seen = now()
  WHERE id = p_user_id;
END;
$$;

-- إنشاء دالة للحصول على معلومات المحادثات مع آخر نشاط
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
  SELECT 
    c.id as conversation_id,
    CASE 
      WHEN c.participant_1 = p_user_id THEN c.participant_2
      ELSE c.participant_1
    END as participant_id,
    p.username as participant_username,
    p.avatar_url as participant_avatar_url,
    p.email as participant_email,
    (
      SELECT m.content 
      FROM messages m 
      WHERE m.conversation_id = c.id 
        AND m.deleted_at IS NULL
      ORDER BY m.created_at DESC 
      LIMIT 1
    ) as last_message,
    c.last_message_at,
    (
      SELECT COUNT(*)::bigint
      FROM messages m
      WHERE m.conversation_id = c.id
        AND m.receiver_id = p_user_id
        AND m.is_read = false
        AND m.deleted_at IS NULL
    ) as unread_count,
    -- المستخدم نشط إذا كان آخر نشاط له خلال آخر 5 دقائق
    (p.last_seen > NOW() - INTERVAL '5 minutes') as is_online,
    p.last_seen
  FROM conversations c
  LEFT JOIN profiles p ON (
    CASE 
      WHEN c.participant_1 = p_user_id THEN p.id = c.participant_2
      ELSE p.id = c.participant_1
    END
  )
  WHERE (c.participant_1 = p_user_id OR c.participant_2 = p_user_id)
    AND c.is_active = true
  ORDER BY c.last_message_at DESC NULLS LAST;
END;
$$;

-- إنشاء trigger لتحديث آخر نشاط عند إرسال رسالة
CREATE OR REPLACE FUNCTION public.update_sender_last_seen()
RETURNS trigger
LANGUAGE plpgsql
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
SECURITY DEFINER
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