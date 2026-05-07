-- إنشاء جدول navigation_history إذا لم يكن موجوداً أو تعديله
DROP TABLE IF EXISTS public.navigation_history;

CREATE TABLE public.navigation_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    path TEXT NOT NULL,
    scroll_position DECIMAL DEFAULT 0,
    page_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إنشاء فهرس للبحث السريع
CREATE INDEX idx_navigation_history_session_id ON public.navigation_history(session_id);
CREATE INDEX idx_navigation_history_user_id ON public.navigation_history(user_id);
CREATE INDEX idx_navigation_history_created_at ON public.navigation_history(created_at);

-- إنشاء trigger لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_navigation_history_updated_at
    BEFORE UPDATE ON public.navigation_history
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- إنشاء دالة لحفظ حالة التنقل
CREATE OR REPLACE FUNCTION public.save_navigation_state(
    p_session_id TEXT,
    p_path TEXT,
    p_scroll_position DECIMAL DEFAULT 0,
    p_page_data JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
BEGIN
    -- حذف الحالات القديمة لنفس الجلسة (الاحتفاظ بآخر حالة فقط)
    DELETE FROM public.navigation_history 
    WHERE session_id = p_session_id;
    
    -- إدراج الحالة الجديدة
    INSERT INTO public.navigation_history (
        user_id,
        session_id,
        path,
        scroll_position,
        page_data
    ) VALUES (
        auth.uid(),
        p_session_id,
        p_path,
        p_scroll_position,
        p_page_data
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء دالة لاسترجاع آخر حالة محفوظة
CREATE OR REPLACE FUNCTION public.get_last_navigation_state(
    p_session_id TEXT
)
RETURNS TABLE(
    path TEXT,
    scroll_position DECIMAL,
    page_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        nh.path,
        nh.scroll_position,
        nh.page_data,
        nh.created_at
    FROM public.navigation_history nh
    WHERE nh.session_id = p_session_id
    ORDER BY nh.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء دالة لمسح الحالات القديمة (أكثر من ساعة)
CREATE OR REPLACE FUNCTION public.cleanup_old_navigation_states()
RETURNS VOID AS $$
BEGIN
    DELETE FROM public.navigation_history 
    WHERE created_at < now() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- تمكين Row Level Security
ALTER TABLE public.navigation_history ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسات الأمان
CREATE POLICY "Users can manage their own navigation history"
ON public.navigation_history
FOR ALL
USING (
    user_id = auth.uid() 
    OR session_id = current_setting('app.session_id', true)
);

-- السماح للمستخدمين غير المسجلين بحفظ البيانات باستخدام session_id
CREATE POLICY "Anonymous users can manage their session navigation"
ON public.navigation_history
FOR ALL
USING (user_id IS NULL AND session_id IS NOT NULL);

-- إنشاء جدول لحفظ تفضيلات المرشحات
CREATE TABLE IF NOT EXISTS public.user_filter_preferences (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT,
    filters JSONB NOT NULL DEFAULT '{}',
    scroll_position DECIMAL DEFAULT 0,
    page_path TEXT DEFAULT '/',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- فهارس للبحث السريع
CREATE INDEX idx_filter_preferences_user_id ON public.user_filter_preferences(user_id);
CREATE INDEX idx_filter_preferences_session_id ON public.user_filter_preferences(session_id);

-- trigger لتحديث updated_at
CREATE TRIGGER update_filter_preferences_updated_at
    BEFORE UPDATE ON public.user_filter_preferences
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- تمكين RLS
ALTER TABLE public.user_filter_preferences ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان للمرشحات
CREATE POLICY "Users can manage their filter preferences"
ON public.user_filter_preferences
FOR ALL
USING (
    user_id = auth.uid() 
    OR (user_id IS NULL AND session_id IS NOT NULL)
);