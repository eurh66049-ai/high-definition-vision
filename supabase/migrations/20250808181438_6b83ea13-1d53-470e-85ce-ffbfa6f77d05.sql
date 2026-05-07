-- إنشاء دالة لجلب المحادثات مع المستخدمين بشكل محسن
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
AS $function$
BEGIN
  RETURN QUERY
  WITH conversation_participants AS (
    SELECT 
      c.id as conv_id,
      CASE 
        WHEN c.participant_1 = p_user_id THEN c.participant_2
        ELSE c.participant_1
      END as other_participant_id
    FROM public.conversations c
    WHERE (c.participant_1 = p_user_id OR c.participant_2 = p_user_id)
      AND c.is_active = true
  ),
  latest_messages AS (
    SELECT DISTINCT ON (m.conversation_id)
      m.conversation_id,
      m.content as last_msg,
      m.created_at as last_msg_at
    FROM public.messages m
    WHERE m.conversation_id IN (SELECT conv_id FROM conversation_participants)
      AND m.deleted_at IS NULL
    ORDER BY m.conversation_id, m.created_at DESC
  ),
  unread_counts AS (
    SELECT 
      m.conversation_id,
      COUNT(*) as unread_count
    FROM public.messages m
    WHERE m.conversation_id IN (SELECT conv_id FROM conversation_participants)
      AND m.receiver_id = p_user_id
      AND m.is_read = false
      AND m.deleted_at IS NULL
    GROUP BY m.conversation_id
  )
  SELECT 
    cp.conv_id::uuid,
    cp.other_participant_id::uuid,
    COALESCE(p.username, p.email, 'مستخدم مجهول')::text,
    p.avatar_url::text,
    p.email::text,
    COALESCE(lm.last_msg, 'لا توجد رسائل بعد')::text,
    lm.last_msg_at,
    COALESCE(uc.unread_count, 0)::bigint,
    (p.last_seen > NOW() - INTERVAL '5 minutes')::boolean,
    p.last_seen
  FROM conversation_participants cp
  LEFT JOIN public.profiles p ON p.id = cp.other_participant_id
  LEFT JOIN latest_messages lm ON lm.conversation_id = cp.conv_id
  LEFT JOIN unread_counts uc ON uc.conversation_id = cp.conv_id
  ORDER BY COALESCE(lm.last_msg_at, NOW()) DESC;
END;
$function$;

-- إنشاء دالة لإنشاء أو جلب محادثة
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(p_user1_id uuid, p_user2_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_conversation_id uuid;
BEGIN
  -- البحث عن محادثة موجودة
  SELECT id INTO v_conversation_id
  FROM public.conversations
  WHERE (participant_1 = p_user1_id AND participant_2 = p_user2_id)
     OR (participant_1 = p_user2_id AND participant_2 = p_user1_id)
  LIMIT 1;
  
  -- إنشاء محادثة جديدة إذا لم تكن موجودة
  IF v_conversation_id IS NULL THEN
    INSERT INTO public.conversations (participant_1, participant_2, created_at, updated_at)
    VALUES (p_user1_id, p_user2_id, NOW(), NOW())
    RETURNING id INTO v_conversation_id;
  END IF;
  
  RETURN v_conversation_id;
END;
$function$;

-- إنشاء دالة لتحديث آخر نشاط للمستخدم
CREATE OR REPLACE FUNCTION public.update_user_last_seen(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  UPDATE public.profiles 
  SET last_seen = NOW()
  WHERE id = p_user_id;
END;
$function$;

-- إنشاء trigger لتحديث محادثة عند إضافة رسالة جديدة
CREATE OR REPLACE FUNCTION public.update_conversation_on_new_message()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- تحديث وقت آخر رسالة في المحادثة
  UPDATE public.conversations
  SET 
    last_message_at = NEW.created_at,
    updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$function$;

-- إنشاء trigger
DROP TRIGGER IF EXISTS trigger_update_conversation_on_new_message ON public.messages;
CREATE TRIGGER trigger_update_conversation_on_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_on_new_message();

-- إنشاء trigger لتحديث وقت آخر رسالة عند تحديث الرسالة
CREATE OR REPLACE FUNCTION public.update_conversation_on_message_update()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- تحديث وقت آخر رسالة في المحادثة فقط إذا لم يتم حذف الرسالة
  IF NEW.deleted_at IS NULL THEN
    UPDATE public.conversations
    SET 
      last_message_at = NEW.updated_at,
      updated_at = NEW.updated_at
    WHERE id = NEW.conversation_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trigger_update_conversation_on_message_update ON public.messages;
CREATE TRIGGER trigger_update_conversation_on_message_update
  AFTER UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_on_message_update();

-- إنشاء index محسن للأداء
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_not_deleted 
ON public.messages (conversation_id, created_at DESC) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_messages_receiver_unread 
ON public.messages (receiver_id, is_read, conversation_id) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_participants 
ON public.conversations (participant_1, participant_2);

-- إعداد realtime للجداول المطلوبة
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;

-- إضافة الجداول إلى publication للـ realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  END IF;
END $$;