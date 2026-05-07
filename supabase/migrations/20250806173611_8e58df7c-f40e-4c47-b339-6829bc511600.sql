-- تحديث جدول navigation_history لدعم scroll_position كـ DECIMAL
ALTER TABLE public.navigation_history 
ALTER COLUMN scroll_position TYPE DECIMAL;

-- تحديث دالة save_navigation_state لتقبل DECIMAL
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

-- تحديث دالة get_last_navigation_state لإرجاع DECIMAL
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

-- تحديث RLS policies للمستخدمين غير المسجلين
DROP POLICY IF EXISTS "Anonymous users can manage their session navigation" ON public.navigation_history;

CREATE POLICY "Anonymous users can manage their session navigation"
ON public.navigation_history
FOR ALL
USING (user_id IS NULL AND session_id IS NOT NULL)
WITH CHECK (user_id IS NULL AND session_id IS NOT NULL);