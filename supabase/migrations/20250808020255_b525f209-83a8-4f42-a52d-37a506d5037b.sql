-- حذف الدوال الموجودة أولاً
DROP FUNCTION IF EXISTS public.mark_messages_as_read(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_conversation_messages(uuid);

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