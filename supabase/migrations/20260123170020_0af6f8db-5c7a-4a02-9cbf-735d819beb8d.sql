-- جدول طلبات المراسلة
CREATE TABLE public.message_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  UNIQUE(sender_id, receiver_id)
);

-- جدول المحادثات
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1 UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  participant_2 UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_participants CHECK (participant_1 < participant_2),
  UNIQUE(participant_1, participant_2)
);

-- جدول الرسائل
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- فهارس للأداء
CREATE INDEX idx_message_requests_sender ON public.message_requests(sender_id);
CREATE INDEX idx_message_requests_receiver ON public.message_requests(receiver_id);
CREATE INDEX idx_message_requests_status ON public.message_requests(status);
CREATE INDEX idx_conversations_participant_1 ON public.conversations(participant_1);
CREATE INDEX idx_conversations_participant_2 ON public.conversations(participant_2);
CREATE INDEX idx_conversations_last_message ON public.conversations(last_message_at DESC);
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX idx_messages_created ON public.messages(created_at DESC);
CREATE INDEX idx_messages_sender ON public.messages(sender_id);

-- تفعيل RLS
ALTER TABLE public.message_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- سياسات طلبات المراسلة
CREATE POLICY "Users can view their own message requests"
ON public.message_requests FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send message requests"
ON public.message_requests FOR INSERT
WITH CHECK (auth.uid() = sender_id AND sender_id != receiver_id);

CREATE POLICY "Receivers can update message requests"
ON public.message_requests FOR UPDATE
USING (auth.uid() = receiver_id)
WITH CHECK (auth.uid() = receiver_id);

CREATE POLICY "Users can delete their sent requests"
ON public.message_requests FOR DELETE
USING (auth.uid() = sender_id AND status = 'pending');

-- سياسات المحادثات
CREATE POLICY "Users can view their conversations"
ON public.conversations FOR SELECT
USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

CREATE POLICY "System can create conversations"
ON public.conversations FOR INSERT
WITH CHECK (auth.uid() = participant_1 OR auth.uid() = participant_2);

-- سياسات الرسائل
CREATE POLICY "Users can view messages in their conversations"
ON public.messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id
    AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
  )
);

CREATE POLICY "Users can send messages in their conversations"
ON public.messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id
    AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
  )
);

CREATE POLICY "Users can update read status of received messages"
ON public.messages FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id
    AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
  )
  AND sender_id != auth.uid()
);

-- تفعيل Realtime
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.message_requests REPLICA IDENTITY FULL;

-- دالة لإنشاء محادثة عند قبول الطلب
CREATE OR REPLACE FUNCTION public.create_conversation_on_accept()
RETURNS TRIGGER AS $$
DECLARE
  p1 UUID;
  p2 UUID;
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    -- ترتيب المشاركين
    IF NEW.sender_id < NEW.receiver_id THEN
      p1 := NEW.sender_id;
      p2 := NEW.receiver_id;
    ELSE
      p1 := NEW.receiver_id;
      p2 := NEW.sender_id;
    END IF;
    
    -- إنشاء المحادثة إذا لم تكن موجودة
    INSERT INTO public.conversations (participant_1, participant_2)
    VALUES (p1, p2)
    ON CONFLICT (participant_1, participant_2) DO NOTHING;
    
    NEW.responded_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_message_request_accepted
BEFORE UPDATE ON public.message_requests
FOR EACH ROW
EXECUTE FUNCTION public.create_conversation_on_accept();

-- دالة لتحديث وقت آخر رسالة
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_new_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_conversation_last_message();

-- دالة لإرسال إشعار طلب المراسلة
CREATE OR REPLACE FUNCTION public.notify_message_request()
RETURNS TRIGGER AS $$
DECLARE
  sender_name TEXT;
BEGIN
  SELECT username INTO sender_name FROM public.profiles WHERE id = NEW.sender_id;
  
  INSERT INTO public.notifications (user_id, type, title, message)
  VALUES (
    NEW.receiver_id,
    'message_request',
    'طلب مراسلة جديد',
    'يريد ' || COALESCE(sender_name, 'مستخدم') || ' مراسلتك'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_message_request_created
AFTER INSERT ON public.message_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_message_request();

-- دالة لإرسال إشعار الرد على الطلب
CREATE OR REPLACE FUNCTION public.notify_message_request_response()
RETURNS TRIGGER AS $$
DECLARE
  receiver_name TEXT;
BEGIN
  IF NEW.status != OLD.status AND NEW.status IN ('accepted', 'rejected') THEN
    SELECT username INTO receiver_name FROM public.profiles WHERE id = NEW.receiver_id;
    
    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (
      NEW.sender_id,
      CASE WHEN NEW.status = 'accepted' THEN 'message_request_accepted' ELSE 'message_request_rejected' END,
      CASE WHEN NEW.status = 'accepted' THEN 'تم قبول طلبك' ELSE 'تم رفض طلبك' END,
      CASE WHEN NEW.status = 'accepted' 
        THEN 'قبل ' || COALESCE(receiver_name, 'المستخدم') || ' طلب مراسلتك، يمكنك الآن بدء المحادثة'
        ELSE 'رفض ' || COALESCE(receiver_name, 'المستخدم') || ' طلب مراسلتك'
      END
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_message_request_responded
AFTER UPDATE ON public.message_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_message_request_response();