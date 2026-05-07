-- إنشاء دالة لإشعارات تحديث الملف الشخصي الشاملة
CREATE OR REPLACE FUNCTION public.notify_comprehensive_profile_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- إرسال إشعار لتحديث صورة الحساب
  IF OLD.avatar_url IS DISTINCT FROM NEW.avatar_url THEN
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      created_at
    ) VALUES (
      NEW.id,
      'تم تحديث صورة الحساب ✅',
      'تم تحديث صورة حسابك بنجاح.',
      'success',
      NOW()
    );
  END IF;
  
  -- إرسال إشعار لتحديث اسم المستخدم
  IF OLD.username IS DISTINCT FROM NEW.username THEN
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      created_at
    ) VALUES (
      NEW.id,
      'تم تحديث اسم المستخدم ✅',
      'تم تحديث اسم المستخدم الخاص بك إلى "' || NEW.username || '" بنجاح.',
      'success',
      NOW()
    );
  END IF;
  
  -- إرسال إشعار لتحديث الجنس
  IF OLD.gender IS DISTINCT FROM NEW.gender AND NEW.gender IS NOT NULL THEN
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      created_at
    ) VALUES (
      NEW.id,
      'تم تحديث بيانات الجنس ✅',
      'تم تحديد جنسك كـ ' || 
      CASE 
        WHEN NEW.gender = 'male' THEN 'ذكر'
        WHEN NEW.gender = 'female' THEN 'أنثى'
        ELSE NEW.gender
      END || ' بنجاح.',
      'success',
      NOW()
    );
  END IF;
  
  -- إرسال إشعار لتحديث الدولة
  IF OLD.country_code IS DISTINCT FROM NEW.country_code THEN
    IF NEW.country_code IS NULL THEN
      -- تم إلغاء اختيار الدولة
      INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        created_at
      ) VALUES (
        NEW.id,
        'تم تحديث بيانات الدولة ✅',
        'تم إلغاء اختيار الدولة من ملفك الشخصي بنجاح.',
        'success',
        NOW()
      );
    ELSE
      -- تم اختيار دولة جديدة
      INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        created_at
      ) VALUES (
        NEW.id,
        'تم تحديث بيانات الدولة ✅',
        'تم تحديد دولتك كـ "' || COALESCE(NEW.country_name, NEW.country_code) || '" بنجاح.',
        'success',
        NOW()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- حذف الـ triggers القديمة إذا كانت موجودة
DROP TRIGGER IF EXISTS notify_profile_updates_trigger ON public.profiles;
DROP TRIGGER IF EXISTS notify_profile_avatar_update_trigger ON public.profiles;
DROP TRIGGER IF EXISTS notify_profile_username_update_trigger ON public.profiles;

-- إنشاء trigger جديد شامل
CREATE TRIGGER notify_comprehensive_profile_updates_trigger
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_comprehensive_profile_updates();