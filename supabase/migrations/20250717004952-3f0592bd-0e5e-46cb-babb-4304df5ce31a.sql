-- إضافة trigger لإشعار تحديث اسم المستخدم
CREATE OR REPLACE FUNCTION public.notify_profile_username_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- إرسال إشعار فقط إذا تم تغيير username
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
  
  RETURN NEW;
END;
$$;

-- إنشاء trigger لتحديث اسم المستخدم
DROP TRIGGER IF EXISTS notify_username_update ON public.profiles;
CREATE TRIGGER notify_username_update
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (OLD.username IS DISTINCT FROM NEW.username)
  EXECUTE FUNCTION public.notify_profile_username_update();

-- تحديث الدالة السابقة لتشمل كل التحديثات
CREATE OR REPLACE FUNCTION public.notify_profile_updates()
RETURNS TRIGGER
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
  
  RETURN NEW;
END;
$$;

-- حذف التريغر القديم وإنشاء تريغر جديد شامل
DROP TRIGGER IF EXISTS notify_avatar_update ON public.profiles;
DROP TRIGGER IF EXISTS notify_username_update ON public.profiles;

CREATE TRIGGER notify_profile_updates_trigger
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_profile_updates();