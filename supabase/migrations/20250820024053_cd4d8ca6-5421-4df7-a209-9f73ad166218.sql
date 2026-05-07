-- إنشاء trigger لإرسال إشعار عند تحديث نبذة المؤلف
CREATE OR REPLACE FUNCTION public.notify_bio_update()
RETURNS TRIGGER AS $$
BEGIN
  -- التحقق من تحديث حقل bio (النبذة)
  IF NEW.bio IS DISTINCT FROM OLD.bio AND NEW.bio IS NOT NULL AND NEW.bio != '' THEN
    -- إدراج إشعار في جدول الإشعارات
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      created_at
    ) VALUES (
      NEW.id,
      'تم تحديث نبذتك الشخصية! ✏️',
      'تم حفظ نبذتك التعريفية الجديدة بنجاح. يمكن للزوار الآن مشاهدتها في ملفك الشخصي.',
      'success',
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ربط الـ trigger بجدول profiles
DROP TRIGGER IF EXISTS profile_bio_update_trigger ON public.profiles;
CREATE TRIGGER profile_bio_update_trigger
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_bio_update();