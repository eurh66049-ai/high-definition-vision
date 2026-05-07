-- إنشاء مهمة تنظيف منجدولة لحذف البيانات القديمة
-- تشغيل دالة التنظيف دورياً
SELECT cron.schedule(
  'cleanup-navigation-history',
  '0 2 * * *', -- يومياً في الساعة 2 صباحاً
  'SELECT public.cleanup_old_navigation_history();'
);

-- إدراج إشعار اختباري لتأكيد عمل النظام
INSERT INTO public.notifications (
  user_id,
  title,
  message,
  type,
  created_at
)
SELECT 
  '00000000-0000-0000-0000-000000000000'::uuid,
  'تم تفعيل نظام حفظ التنقل ✅',
  'تم تطبيق نظام حفظ حالة التنقل والمرشحات بنجاح. الآن عند العودة للأقسام ستجد الكتب والمرشحات كما تركتها.',
  'info',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.notifications 
  WHERE title LIKE '%نظام حفظ التنقل%'
);

-- فهرسة إضافية لتحسين الأداء
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_navigation_history_path_user ON public.navigation_history(path, user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_navigation_history_path_session ON public.navigation_history(path, session_id);