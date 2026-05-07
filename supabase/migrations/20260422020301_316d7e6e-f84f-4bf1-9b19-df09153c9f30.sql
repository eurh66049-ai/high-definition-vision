
DO $$
DECLARE
  old_id uuid := '909cfa5a-7766-4ccd-97d6-99e7e3d51761';
  new_id uuid := '00000000-0000-0000-0000-00000000a1a1';
  conv RECORD;
  existing_conv_id uuid;
  other_user uuid;
BEGIN
  -- معالجة كل محادثة مرتبطة بالحساب القديم
  FOR conv IN SELECT * FROM conversations
              WHERE participant_1 = old_id OR participant_2 = old_id LOOP
    -- المستخدم الآخر في المحادثة
    other_user := CASE WHEN conv.participant_1 = old_id THEN conv.participant_2 ELSE conv.participant_1 END;

    -- إذا كان المستخدم الآخر هو الحساب الجديد نفسه → احذف المحادثة (بوت-بوت)
    IF other_user = new_id THEN
      DELETE FROM messages WHERE conversation_id = conv.id;
      DELETE FROM conversations WHERE id = conv.id;
      CONTINUE;
    END IF;

    -- هل توجد محادثة بين هذا المستخدم والحساب الجديد؟
    SELECT id INTO existing_conv_id
    FROM conversations
    WHERE (participant_1 = other_user AND participant_2 = new_id)
       OR (participant_1 = new_id AND participant_2 = other_user)
    LIMIT 1;

    IF existing_conv_id IS NOT NULL THEN
      UPDATE messages SET conversation_id = existing_conv_id WHERE conversation_id = conv.id;
      DELETE FROM conversations WHERE id = conv.id;
    ELSE
      -- استبدل الحساب القديم بالجديد في هذه المحادثة
      IF conv.participant_1 = old_id THEN
        UPDATE conversations SET participant_1 = new_id WHERE id = conv.id;
      ELSE
        UPDATE conversations SET participant_2 = new_id WHERE id = conv.id;
      END IF;
    END IF;
  END LOOP;

  UPDATE messages SET sender_id = new_id WHERE sender_id = old_id;
  UPDATE message_requests SET sender_id = new_id WHERE sender_id = old_id;
  UPDATE message_requests SET receiver_id = new_id WHERE receiver_id = old_id;
END $$;

DELETE FROM profiles WHERE id = '909cfa5a-7766-4ccd-97d6-99e7e3d51761';
DELETE FROM auth.users WHERE id = '909cfa5a-7766-4ccd-97d6-99e7e3d51761';

UPDATE profiles
SET last_seen = '2000-01-01T00:00:00Z'::timestamptz,
    allow_messaging = true
WHERE id = '00000000-0000-0000-0000-00000000a1a1';
