-- إضافة دالة لتحديث آخر نشاط للمستخدم
CREATE OR REPLACE FUNCTION public.update_user_last_seen(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- تحديث آخر نشاط في جدول profiles
  UPDATE public.profiles 
  SET last_seen = NOW()
  WHERE id = p_user_id;
  
  -- إذا لم يوجد المستخدم في profiles، إنشاؤه
  IF NOT FOUND THEN
    INSERT INTO public.profiles (id, username, email, last_seen)
    SELECT 
      p_user_id,
      COALESCE(au.email, 'مستخدم جديد'),
      au.email,
      NOW()
    FROM auth.users au 
    WHERE au.id = p_user_id
    ON CONFLICT (id) DO UPDATE SET last_seen = NOW();
  END IF;
END;
$function$;

-- إضافة دالة للحصول على المحادثات مع معلومات آخر نشاط محدثة
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
  SELECT DISTINCT ON (COALESCE(c.participant_1, c.participant_2))
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
    COALESCE(unread.count, 0) as unread_count,
    -- يعتبر المستخدم نشط إذا كان آخر نشاط خلال آخر 5 دقائق
    CASE 
      WHEN p.last_seen IS NOT NULL AND p.last_seen > (NOW() - INTERVAL '5 minutes') THEN true
      ELSE false
    END as is_online,
    p.last_seen
  FROM public.conversations c
  LEFT JOIN public.profiles p ON (
    CASE 
      WHEN c.participant_1 = p_user_id THEN c.participant_2 = p.id
      ELSE c.participant_1 = p.id
    END
  )
  LEFT JOIN LATERAL (
    SELECT content, created_at
    FROM public.messages msg
    WHERE msg.conversation_id = c.id
      AND msg.deleted_at IS NULL
    ORDER BY msg.created_at DESC
    LIMIT 1
  ) m ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*) as count
    FROM public.messages unread_msg
    WHERE unread_msg.conversation_id = c.id
      AND unread_msg.receiver_id = p_user_id
      AND unread_msg.is_read = false
      AND unread_msg.deleted_at IS NULL
  ) unread ON true
  WHERE (c.participant_1 = p_user_id OR c.participant_2 = p_user_id)
    AND c.is_active = true
  ORDER BY 
    COALESCE(c.participant_1, c.participant_2),
    m.created_at DESC NULLS LAST;
END;
$function$;

-- إضافة trigger لتحديث آخر نشاط عند إرسال رسالة
CREATE OR REPLACE FUNCTION public.update_sender_last_seen()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- تحديث آخر نشاط للمرسل عند إرسال رسالة جديدة
  UPDATE public.profiles 
  SET last_seen = NOW()
  WHERE id = NEW.sender_id;
  
  RETURN NEW;
END;
$function$;

-- إنشاء trigger على جدول messages
DROP TRIGGER IF EXISTS trigger_update_sender_last_seen ON public.messages;
CREATE TRIGGER trigger_update_sender_last_seen
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_sender_last_seen();

-- إضافة جدول لتتبع حالة الاتصال في الوقت الفعلي
CREATE TABLE IF NOT EXISTS public.user_presence (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_online boolean NOT NULL DEFAULT false,
  last_ping timestamp with time zone NOT NULL DEFAULT now(),
  session_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_session UNIQUE(user_id, session_id)
);

-- تمكين RLS على جدول user_presence
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

-- إضافة سياسات RLS
CREATE POLICY "Users can manage their own presence" ON public.user_presence
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Everyone can view user presence" ON public.user_presence
  FOR SELECT USING (true);

-- إضافة فهرسة لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_user_presence_user_id ON public.user_presence(user_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_last_ping ON public.user_presence(last_ping);
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON public.profiles(last_seen);

-- دالة لتحديث حالة الاتصال
CREATE OR REPLACE FUNCTION public.update_user_presence(
  p_user_id uuid,
  p_session_id text DEFAULT null,
  p_is_online boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- تحديث حالة الاتصال
  INSERT INTO public.user_presence (user_id, session_id, is_online, last_ping)
  VALUES (p_user_id, p_session_id, p_is_online, NOW())
  ON CONFLICT (user_id, session_id) 
  DO UPDATE SET 
    is_online = p_is_online,
    last_ping = NOW(),
    updated_at = NOW();

  -- تحديث آخر نشاط في profiles أيضاً
  UPDATE public.profiles 
  SET last_seen = NOW()
  WHERE id = p_user_id;
END;
$function$;

-- دالة لتنظيف حالات الاتصال القديمة
CREATE OR REPLACE FUNCTION public.cleanup_old_presence()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  deleted_count integer;
BEGIN
  -- حذف حالات الاتصال القديمة أكثر من 10 دقائق
  DELETE FROM public.user_presence 
  WHERE last_ping < (NOW() - INTERVAL '10 minutes');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$function$;