-- إصلاح RLS policies بدون الحاجة لعمود role
-- حل مشكلة تسجيل المخالفات

-- إنشاء جدول message_violations إذا لم يكن موجوداً
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

-- حذف policies القديمة
DROP POLICY IF EXISTS "Users can view their own violations" ON public.message_violations;
DROP POLICY IF EXISTS "System can log violations for authenticated users" ON public.message_violations;

-- إنشاء policies بسيطة وآمنة
-- السماح للمستخدمين بعرض مخالفاتهم الخاصة
CREATE POLICY "Users can view their own violations"
ON public.message_violations
FOR SELECT
USING (auth.uid() = user_id);

-- السماح لأي مستخدم مصادق عليه بإدراج مخالفة باسمه
CREATE POLICY "System can log violations for authenticated users"
ON public.message_violations
FOR INSERT
WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

-- إنشاء جدول banned_users إذا لم يكن موجوداً
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

-- حذف policies القديمة لـ banned_users
DROP POLICY IF EXISTS "Users can view their own ban status" ON public.banned_users;
DROP POLICY IF EXISTS "System can ban authenticated users" ON public.banned_users;

-- policies آمنة لـ banned_users
CREATE POLICY "Users can view their own ban status"
ON public.banned_users
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can ban authenticated users"
ON public.banned_users
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- إنشاء جدول banned_words إذا لم يكن موجوداً
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

-- إضافة بعض الكلمات المحظورة الأساسية
INSERT INTO public.banned_words (word, category, severity) VALUES 
('احمار', 'profanity', 'medium'),
('كلب', 'profanity', 'medium'),
('حمار', 'profanity', 'medium')
ON CONFLICT (word) DO NOTHING;

-- إنشاء indexes للأداء
CREATE INDEX IF NOT EXISTS idx_message_violations_user_id ON public.message_violations(user_id);
CREATE INDEX IF NOT EXISTS idx_message_violations_detected_at ON public.message_violations(detected_at);
CREATE INDEX IF NOT EXISTS idx_banned_users_user_id ON public.banned_users(user_id);
CREATE INDEX IF NOT EXISTS idx_banned_users_is_active ON public.banned_users(is_active);