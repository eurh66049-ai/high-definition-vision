-- إنشاء جدول المحادثات
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_1 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  participant_2 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_message_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(participant_1, participant_2)
);

-- إنشاء جدول الرسائل
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  edited_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- تمكين Row Level Security
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- سياسات الحماية للمحادثات
CREATE POLICY "Users can view their own conversations" 
ON public.conversations 
FOR SELECT 
USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

CREATE POLICY "Users can create conversations" 
ON public.conversations 
FOR INSERT 
WITH CHECK (auth.uid() = participant_1 OR auth.uid() = participant_2);

CREATE POLICY "Users can update their own conversations" 
ON public.conversations 
FOR UPDATE 
USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

-- سياسات الحماية للرسائل
CREATE POLICY "Users can view messages in their conversations" 
ON public.messages 
FOR SELECT 
USING (
  auth.uid() = sender_id OR 
  auth.uid() = receiver_id OR
  EXISTS (
    SELECT 1 FROM public.conversations 
    WHERE id = conversation_id 
    AND (participant_1 = auth.uid() OR participant_2 = auth.uid())
  )
);

CREATE POLICY "Users can send messages" 
ON public.messages 
FOR INSERT 
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their own messages" 
ON public.messages 
FOR UPDATE 
USING (auth.uid() = sender_id);

CREATE POLICY "Users can delete their own messages" 
ON public.messages 
FOR DELETE 
USING (auth.uid() = sender_id);

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX idx_conversations_participants ON public.conversations(participant_1, participant_2);
CREATE INDEX idx_conversations_updated_at ON public.conversations(updated_at DESC);
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX idx_messages_sender_receiver ON public.messages(sender_id, receiver_id);
CREATE INDEX idx_messages_is_read ON public.messages(is_read) WHERE is_read = false;

-- دالة لتحديث وقت آخر رسالة في المحادثة
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations 
  SET 
    last_message_at = NEW.created_at,
    updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ترايجر لتحديث وقت المحادثة عند إضافة رسالة جديدة
CREATE TRIGGER update_conversation_on_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_timestamp();

-- دالة لتحديث updated_at في المحادثات
CREATE OR REPLACE FUNCTION public.update_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ترايجر لتحديث updated_at في المحادثات
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversations_updated_at();

-- دالة لتحديث updated_at في الرسائل
CREATE OR REPLACE FUNCTION public.update_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ترايجر لتحديث updated_at في الرسائل
CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_messages_updated_at();

-- دالة للحصول على المحادثات مع آخر رسالة
CREATE OR REPLACE FUNCTION public.get_user_conversations(p_user_id UUID)
RETURNS TABLE(
  conversation_id UUID,
  participant_id UUID,
  participant_username TEXT,
  participant_avatar_url TEXT,
  participant_email TEXT,
  last_message TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  unread_count BIGINT,
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
    p.username as participant_username,
    p.avatar_url as participant_avatar_url,
    p.email as participant_email,
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
      SELECT COUNT(*)
      FROM public.messages m
      WHERE m.conversation_id = c.id
      AND m.receiver_id = p_user_id
      AND m.is_read = false
      AND m.deleted_at IS NULL
    ) as unread_count,
    false as is_online -- يمكن تطويرها لاحقاً مع نظام الـ presence
  FROM public.conversations c
  LEFT JOIN public.profiles p ON (
    CASE 
      WHEN c.participant_1 = p_user_id THEN c.participant_2
      ELSE c.participant_1
    END = p.id
  )
  WHERE (c.participant_1 = p_user_id OR c.participant_2 = p_user_id)
  AND c.is_active = true
  ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC;
END;
$$;

-- دالة لإنشاء أو العثور على محادثة بين مستخدمين
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(p_user1_id UUID, p_user2_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  -- التحقق من وجود محادثة موجودة
  SELECT id INTO v_conversation_id
  FROM public.conversations
  WHERE (participant_1 = p_user1_id AND participant_2 = p_user2_id)
     OR (participant_1 = p_user2_id AND participant_2 = p_user1_id)
  LIMIT 1;
  
  -- إنشاء محادثة جديدة إذا لم توجد
  IF v_conversation_id IS NULL THEN
    INSERT INTO public.conversations (participant_1, participant_2)
    VALUES (p_user1_id, p_user2_id)
    RETURNING id INTO v_conversation_id;
  END IF;
  
  RETURN v_conversation_id;
END;
$$;

-- دالة لعلامة الرسائل كمقروءة
CREATE OR REPLACE FUNCTION public.mark_messages_as_read(p_conversation_id UUID, p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  UPDATE public.messages
  SET is_read = true, updated_at = now()
  WHERE conversation_id = p_conversation_id
  AND receiver_id = p_user_id
  AND is_read = false
  AND deleted_at IS NULL;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  RETURN v_updated_count;
END;
$$;