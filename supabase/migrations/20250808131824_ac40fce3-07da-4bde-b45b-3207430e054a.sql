-- إصلاح RLS policies لجدول message_violations
-- السماح للمستخدمين المصادق عليهم بإدراج مخالفاتهم الخاصة

-- التحقق من وجود الجدول أولاً وإنشاؤه إذا لم يكن موجوداً
CREATE TABLE IF NOT EXISTS public.message_violations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message_id UUID,
    violation_type TEXT NOT NULL,
    violation_reason TEXT NOT NULL,
    message_content TEXT,
    severity_level TEXT NOT NULL CHECK (severity_level IN ('low', 'medium', 'high', 'critical')),
    action_taken TEXT CHECK (action_taken IN ('warning', 'temp_ban', 'permanent_ban')),
    detected_by TEXT DEFAULT 'ai_moderation',
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- تفعيل RLS
ALTER TABLE public.message_violations ENABLE ROW LEVEL SECURITY;

-- حذف policies القديمة إن وجدت
DROP POLICY IF EXISTS "Users can view their own violations" ON public.message_violations;
DROP POLICY IF EXISTS "System can log violations for users" ON public.message_violations;
DROP POLICY IF EXISTS "Admins can view all violations" ON public.message_violations;

-- إنشاء policies جديدة
-- السماح للمستخدمين بعرض مخالفاتهم الخاصة
CREATE POLICY "Users can view their own violations"
ON public.message_violations
FOR SELECT
USING (auth.uid() = user_id);

-- السماح لأي مستخدم مصادق عليه بإدراج مخالفة (سيتم تسجيل المخالفة باسم المستخدم الحالي)
CREATE POLICY "System can log violations for authenticated users"
ON public.message_violations
FOR INSERT
WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

-- السماح للإدارة بعرض جميع المخالفات
CREATE POLICY "Admins can view all violations"
ON public.message_violations
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'
    )
);

-- التأكد من وجود جدول banned_users أيضاً
CREATE TABLE IF NOT EXISTS public.banned_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    ban_type TEXT NOT NULL CHECK (ban_type IN ('temporary', 'permanent')),
    expires_at TIMESTAMP WITH TIME ZONE,
    banned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    banned_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- تفعيل RLS لجدول banned_users
ALTER TABLE public.banned_users ENABLE ROW LEVEL SECURITY;

-- policies لجدول banned_users
DROP POLICY IF EXISTS "Users can view their own ban status" ON public.banned_users;
DROP POLICY IF EXISTS "System can ban users" ON public.banned_users;
DROP POLICY IF EXISTS "Admins can view all bans" ON public.banned_users;

CREATE POLICY "Users can view their own ban status"
ON public.banned_users
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can ban authenticated users"
ON public.banned_users
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can view and manage all bans"
ON public.banned_users
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'
    )
);

-- إنشاء indexes للأداء
CREATE INDEX IF NOT EXISTS idx_message_violations_user_id ON public.message_violations(user_id);
CREATE INDEX IF NOT EXISTS idx_message_violations_detected_at ON public.message_violations(detected_at);
CREATE INDEX IF NOT EXISTS idx_banned_users_user_id ON public.banned_users(user_id);
CREATE INDEX IF NOT EXISTS idx_banned_users_is_active ON public.banned_users(is_active);

-- التحقق من وجود جدول banned_words
CREATE TABLE IF NOT EXISTS public.banned_words (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    word TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL DEFAULT 'general',
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- تفعيل RLS لجدول banned_words
ALTER TABLE public.banned_words ENABLE ROW LEVEL SECURITY;

-- السماح لجميع المستخدمين المصادق عليهم بقراءة الكلمات المحظورة
CREATE POLICY "Authenticated users can read banned words"
ON public.banned_words
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- السماح للإدارة فقط بإدارة الكلمات المحظورة
CREATE POLICY "Admins can manage banned words"
ON public.banned_words
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'
    )
);

-- إضافة بعض الكلمات المحظورة الأساسية
INSERT INTO public.banned_words (word, category, severity) VALUES 
('احمار', 'profanity', 'medium'),
('كلب', 'profanity', 'medium'),
('حمار', 'profanity', 'medium')
ON CONFLICT (word) DO NOTHING;