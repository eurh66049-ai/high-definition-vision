-- إنشاء جدول لحفظ تاريخ التنقل في Supabase
CREATE TABLE public.navigation_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  path TEXT NOT NULL,
  scroll_position INTEGER DEFAULT 0,
  page_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- تمكين RLS
ALTER TABLE public.navigation_history ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسات الأمان
CREATE POLICY "Users can manage their own navigation history"
ON public.navigation_history
FOR ALL
USING (
  -- السماح للمستخدمين المسجلين بإدارة تاريخهم
  auth.uid() = user_id OR 
  -- السماح للجلسات غير المسجلة بإدارة تاريخها بناءً على session_id
  (auth.uid() IS NULL AND session_id IS NOT NULL)
)
WITH CHECK (
  auth.uid() = user_id OR 
  (auth.uid() IS NULL AND session_id IS NOT NULL)
);

-- إنشاء فهرس لتحسين الأداء
CREATE INDEX idx_navigation_history_user_session ON public.navigation_history(user_id, session_id);
CREATE INDEX idx_navigation_history_created_at ON public.navigation_history(created_at);

-- دالة لتنظيف التاريخ القديم (أكثر من 7 أيام)
CREATE OR REPLACE FUNCTION public.cleanup_old_navigation_history()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.navigation_history
  WHERE created_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- إنشاء دالة لحفظ حالة التنقل
CREATE OR REPLACE FUNCTION public.save_navigation_state(
  p_session_id TEXT,
  p_path TEXT,
  p_scroll_position INTEGER DEFAULT 0,
  p_page_data JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_navigation_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  -- حذف الحالات القديمة لنفس الجلسة والمسار
  DELETE FROM public.navigation_history
  WHERE (user_id = v_user_id OR session_id = p_session_id)
    AND path = p_path;
  
  -- إدراج الحالة الجديدة
  INSERT INTO public.navigation_history (
    user_id,
    session_id,
    path,
    scroll_position,
    page_data
  ) VALUES (
    v_user_id,
    p_session_id,
    p_path,
    p_scroll_position,
    p_page_data
  ) RETURNING id INTO v_navigation_id;
  
  RETURN v_navigation_id;
END;
$$;

-- إنشاء دالة لاسترجاع آخر حالة تنقل
CREATE OR REPLACE FUNCTION public.get_last_navigation_state(
  p_session_id TEXT
)
RETURNS TABLE(
  path TEXT,
  scroll_position INTEGER,
  page_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  RETURN QUERY
  SELECT 
    nh.path,
    nh.scroll_position,
    nh.page_data,
    nh.created_at
  FROM public.navigation_history nh
  WHERE (nh.user_id = v_user_id OR nh.session_id = p_session_id)
  ORDER BY nh.created_at DESC
  LIMIT 1;
END;
$$;