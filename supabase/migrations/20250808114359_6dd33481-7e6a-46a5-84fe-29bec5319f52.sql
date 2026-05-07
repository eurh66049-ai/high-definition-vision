-- إنشاء جدول للمستخدمين المحظورين
CREATE TABLE banned_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  banned_by uuid,
  reason text NOT NULL,
  ban_type text NOT NULL DEFAULT 'temporary' CHECK (ban_type IN ('temporary', 'permanent')),
  banned_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- إنشاء جدول لسجل الرسائل المخالفة
CREATE TABLE message_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL,
  user_id uuid NOT NULL,
  violation_type text NOT NULL,
  violation_reason text NOT NULL,
  message_content text NOT NULL,
  severity_level text NOT NULL DEFAULT 'medium' CHECK (severity_level IN ('low', 'medium', 'high', 'critical')),
  action_taken text NOT NULL DEFAULT 'warning' CHECK (action_taken IN ('warning', 'message_deleted', 'temporary_ban', 'permanent_ban')),
  detected_by text NOT NULL DEFAULT 'ai_bot',
  detected_at timestamp with time zone DEFAULT now(),
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  is_false_positive boolean DEFAULT false
);

-- إنشاء جدول لكلمات محظورة
CREATE TABLE banned_words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  word text NOT NULL UNIQUE,
  category text NOT NULL DEFAULT 'inappropriate',
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  language text DEFAULT 'ar',
  created_at timestamp with time zone DEFAULT now(),
  is_active boolean DEFAULT true
);

-- إدخال كلمات محظورة أساسية
INSERT INTO banned_words (word, category, severity, language) VALUES 
('كلب', 'insult', 'medium', 'ar'),
('حمار', 'insult', 'medium', 'ar'),
('غبي', 'insult', 'low', 'ar'),
('أحمق', 'insult', 'medium', 'ar'),
('لعنة', 'profanity', 'high', 'ar'),
('اللعنة', 'profanity', 'high', 'ar'),
('shit', 'profanity', 'high', 'en'),
('fuck', 'profanity', 'critical', 'en'),
('bitch', 'profanity', 'high', 'en'),
('damn', 'profanity', 'medium', 'en'),
('stupid', 'insult', 'low', 'en'),
('idiot', 'insult', 'medium', 'en');

-- تمكين RLS للجداول الجديدة
ALTER TABLE banned_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE banned_words ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسات للمديرين فقط للوصول للجداول الحساسة
CREATE POLICY "Only admins can access banned users" 
ON banned_users FOR ALL 
USING (is_current_user_admin());

CREATE POLICY "Only admins can access message violations" 
ON message_violations FOR ALL 
USING (is_current_user_admin());

CREATE POLICY "Admins can manage banned words" 
ON banned_words FOR ALL 
USING (is_current_user_admin());

-- سماح للقراءة العامة للكلمات المحظورة للنظام
CREATE POLICY "System can read banned words" 
ON banned_words FOR SELECT 
USING (true);

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX idx_banned_users_user_id ON banned_users(user_id);
CREATE INDEX idx_banned_users_active ON banned_users(is_active);
CREATE INDEX idx_message_violations_user_id ON message_violations(user_id);
CREATE INDEX idx_message_violations_detected_at ON message_violations(detected_at);
CREATE INDEX idx_banned_words_word ON banned_words(word);
CREATE INDEX idx_banned_words_active ON banned_words(is_active);

-- إنشاء دالة للتحقق من حظر المستخدم
CREATE OR REPLACE FUNCTION is_user_banned(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM banned_users 
    WHERE user_id = p_user_id 
    AND is_active = true 
    AND (expires_at IS NULL OR expires_at > now())
  );
END;
$$;

-- إنشاء دالة لفحص الرسائل تلقائياً
CREATE OR REPLACE FUNCTION check_message_content()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  banned_word_found text;
  word_severity text;
  violation_count integer;
BEGIN
  -- التحقق من وجود كلمات محظورة
  SELECT bw.word, bw.severity INTO banned_word_found, word_severity
  FROM banned_words bw
  WHERE bw.is_active = true 
  AND (LOWER(NEW.content) LIKE '%' || LOWER(bw.word) || '%')
  ORDER BY 
    CASE bw.severity 
      WHEN 'critical' THEN 4
      WHEN 'high' THEN 3 
      WHEN 'medium' THEN 2
      WHEN 'low' THEN 1
    END DESC
  LIMIT 1;

  -- إذا وُجدت كلمة محظورة
  IF banned_word_found IS NOT NULL THEN
    -- تسجيل المخالفة
    INSERT INTO message_violations (
      message_id, user_id, violation_type, violation_reason, 
      message_content, severity_level, action_taken, detected_by
    ) VALUES (
      NEW.id, NEW.sender_id, 'banned_word', 
      'استخدام كلمة محظورة: ' || banned_word_found,
      NEW.content, word_severity, 
      CASE word_severity
        WHEN 'critical' THEN 'permanent_ban'
        WHEN 'high' THEN 'temporary_ban'
        WHEN 'medium' THEN 'message_deleted'
        ELSE 'warning'
      END,
      'auto_moderator'
    );

    -- عد المخالفات السابقة للمستخدم
    SELECT COUNT(*) INTO violation_count
    FROM message_violations
    WHERE user_id = NEW.sender_id
    AND detected_at > now() - interval '30 days';

    -- اتخاذ إجراء بناءً على الخطورة وعدد المخالفات
    IF word_severity = 'critical' OR violation_count >= 5 THEN
      -- حظر دائم
      INSERT INTO banned_users (user_id, reason, ban_type, banned_by)
      VALUES (NEW.sender_id, 'استخدام لغة مخالفة شديدة أو تكرار المخالفات', 'permanent', NULL);
      
      -- حذف الرسالة
      NEW.deleted_at = now();
      NEW.content = '[تم حذف هذه الرسالة لمخالفتها شروط الاستخدام]';
      
    ELSIF word_severity = 'high' OR violation_count >= 3 THEN
      -- حظر مؤقت لمدة 7 أيام
      INSERT INTO banned_users (user_id, reason, ban_type, expires_at, banned_by)
      VALUES (NEW.sender_id, 'استخدام لغة مخالفة', 'temporary', now() + interval '7 days', NULL);
      
      -- حذف الرسالة
      NEW.deleted_at = now();
      NEW.content = '[تم حذف هذه الرسالة لمخالفتها شروط الاستخدام]';
      
    ELSIF word_severity = 'medium' THEN
      -- حذف الرسالة فقط
      NEW.deleted_at = now();
      NEW.content = '[تم حذف هذه الرسالة لمخالفتها شروط الاستخدام]';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- إنشاء ترايجر لفحص الرسائل عند إدراجها
CREATE TRIGGER check_message_content_trigger
  BEFORE INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION check_message_content();

-- إنشاء فهرس لتحسين استعلامات RPC للمحادثات
CREATE INDEX IF NOT EXISTS idx_conversations_participants ON conversations(participant_1, participant_2);

-- إنشاء دالة محسنة لجلب المحادثات مع معلومات المستخدمين المحدثة
CREATE OR REPLACE FUNCTION get_user_conversations(p_user_id uuid)
RETURNS TABLE (
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
    COALESCE(p.username, 'مستخدم غير معروف') as participant_username,
    p.avatar_url as participant_avatar_url,
    COALESCE(p.email, '') as participant_email,
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
    CASE 
      WHEN p.last_seen > now() - interval '5 minutes' THEN true
      ELSE false
    END as is_online,
    p.last_seen
  FROM conversations c
  LEFT JOIN profiles p ON (
    CASE 
      WHEN c.participant_1 = p_user_id THEN c.participant_2 = p.id
      ELSE c.participant_1 = p.id
    END
  )
  WHERE (c.participant_1 = p_user_id OR c.participant_2 = p_user_id)
  AND c.is_active = true
  ORDER BY c.last_message_at DESC NULLS LAST;
END;
$$;