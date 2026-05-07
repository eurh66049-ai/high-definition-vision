-- فهرسة إضافية لتحسين الأداء (بدون CONCURRENTLY للتنفيذ داخل المعاملة)
CREATE INDEX IF NOT EXISTS idx_navigation_history_path_user ON public.navigation_history(path, user_id);
CREATE INDEX IF NOT EXISTS idx_navigation_history_path_session ON public.navigation_history(path, session_id);

-- إنشاء دالة مساعدة لتنظيف البيانات القديمة (يمكن استدعاؤها يدوياً)
CREATE OR REPLACE FUNCTION public.manual_cleanup_navigation_history()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- حذف السجلات الأقدم من 7 أيام
  DELETE FROM public.navigation_history
  WHERE created_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN 'تم حذف ' || deleted_count || ' سجل قديم من تاريخ التنقل.';
END;
$$;