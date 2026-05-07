
DO $$
DECLARE
  old_bot uuid := '909cfa5a-7766-4ccd-97d6-99e7e3d51761';
  new_bot uuid := '00000000-0000-0000-0000-00000000a1a1';
  conv_record RECORD;
  existing_new_conv uuid;
  p1 uuid;
  p2 uuid;
BEGIN
  FOR conv_record IN
    SELECT id,
           CASE WHEN participant_1 = old_bot THEN participant_2 ELSE participant_1 END AS other_user
    FROM public.conversations
    WHERE participant_1 = old_bot OR participant_2 = old_bot
  LOOP
    -- ابحث عن محادثة مع البوت الجديد بأي ترتيب
    SELECT id INTO existing_new_conv
    FROM public.conversations
    WHERE id <> conv_record.id
      AND ((participant_1 = new_bot AND participant_2 = conv_record.other_user)
        OR (participant_2 = new_bot AND participant_1 = conv_record.other_user))
    LIMIT 1;

    IF existing_new_conv IS NOT NULL THEN
      -- نقل الرسائل ودمج
      UPDATE public.messages
      SET conversation_id = existing_new_conv,
          sender_id = CASE WHEN sender_id = old_bot THEN new_bot ELSE sender_id END
      WHERE conversation_id = conv_record.id;

      DELETE FROM public.conversations WHERE id = conv_record.id;
    ELSE
      -- تطبيع الترتيب: الأصغر في participant_1
      IF new_bot < conv_record.other_user THEN
        p1 := new_bot;
        p2 := conv_record.other_user;
      ELSE
        p1 := conv_record.other_user;
        p2 := new_bot;
      END IF;

      UPDATE public.conversations
      SET participant_1 = p1,
          participant_2 = p2
      WHERE id = conv_record.id;

      UPDATE public.messages
      SET sender_id = new_bot
      WHERE conversation_id = conv_record.id AND sender_id = old_bot;
    END IF;
  END LOOP;

  -- تحديث ملف البوت الموحد
  UPDATE public.profiles
  SET username = 'Kotobi AI',
      bio = 'المساعد الذكي لمنصة كتبي. اسألني عن أي شيء يخص الموقع، الكتب، المؤلفين، أو كيفية استخدام المنصة.',
      is_verified = true,
      allow_messaging = true
  WHERE id = new_bot;

  -- منع المراسلة على البوت القديم
  UPDATE public.profiles
  SET allow_messaging = false
  WHERE id = old_bot;
END $$;

-- Trigger: إنشاء محادثة Kotobi AI تلقائياً (يحترم ترتيب participant_1 < participant_2)
CREATE OR REPLACE FUNCTION public.create_kotobi_ai_conversation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ai_bot_id uuid := '00000000-0000-0000-0000-00000000a1a1';
  welcome_msg text := 'مرحباً بك في منصة كتبي! 👋

أنا Kotobi AI، مساعدك الذكي. يمكنني مساعدتك في:
📚 البحث عن الكتب والمؤلفين
💡 اقتراحات قراءة مخصصة
ℹ️ شرح ميزات الموقع وكيفية استخدامها
✍️ الإجابة على أي سؤال يخص المنصة

اسألني عن أي شيء وسأساعدك!';
  new_conv_id uuid;
  p1 uuid;
  p2 uuid;
BEGIN
  IF NEW.id = ai_bot_id THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.conversations
    WHERE (participant_1 = NEW.id AND participant_2 = ai_bot_id)
       OR (participant_2 = NEW.id AND participant_1 = ai_bot_id)
  ) THEN
    RETURN NEW;
  END IF;

  -- ai_bot_id = '0000...' وهو دائماً أصغر من أي uuid عادي
  IF ai_bot_id < NEW.id THEN
    p1 := ai_bot_id; p2 := NEW.id;
  ELSE
    p1 := NEW.id; p2 := ai_bot_id;
  END IF;

  INSERT INTO public.conversations (participant_1, participant_2, last_message_at)
  VALUES (p1, p2, now())
  RETURNING id INTO new_conv_id;

  INSERT INTO public.messages (conversation_id, sender_id, content, is_read)
  VALUES (new_conv_id, ai_bot_id, welcome_msg, false);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_kotobi_ai_conversation ON public.profiles;
CREATE TRIGGER trg_create_kotobi_ai_conversation
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.create_kotobi_ai_conversation();

-- ترحيل المستخدمين الحاليين (مع احترام الترتيب)
DO $$
DECLARE
  ai_bot_id uuid := '00000000-0000-0000-0000-00000000a1a1';
  welcome_msg text := 'مرحباً بك في منصة كتبي! 👋

أنا Kotobi AI، مساعدك الذكي. يمكنني مساعدتك في:
📚 البحث عن الكتب والمؤلفين
💡 اقتراحات قراءة مخصصة
ℹ️ شرح ميزات الموقع وكيفية استخدامها
✍️ الإجابة على أي سؤال يخص المنصة

اسألني عن أي شيء وسأساعدك!';
  user_rec RECORD;
  new_conv_id uuid;
  p1 uuid;
  p2 uuid;
BEGIN
  FOR user_rec IN
    SELECT p.id FROM public.profiles p
    WHERE p.id <> ai_bot_id
      AND NOT EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE (c.participant_1 = p.id AND c.participant_2 = ai_bot_id)
           OR (c.participant_2 = p.id AND c.participant_1 = ai_bot_id)
      )
  LOOP
    IF ai_bot_id < user_rec.id THEN
      p1 := ai_bot_id; p2 := user_rec.id;
    ELSE
      p1 := user_rec.id; p2 := ai_bot_id;
    END IF;

    INSERT INTO public.conversations (participant_1, participant_2, last_message_at)
    VALUES (p1, p2, now())
    RETURNING id INTO new_conv_id;

    INSERT INTO public.messages (conversation_id, sender_id, content, is_read)
    VALUES (new_conv_id, ai_bot_id, welcome_msg, false);
  END LOOP;
END $$;
