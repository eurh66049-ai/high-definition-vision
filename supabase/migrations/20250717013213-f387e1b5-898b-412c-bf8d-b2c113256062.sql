-- تحديث دالة الإشعارات لتشمل تحديث الجنس
CREATE OR REPLACE FUNCTION public.notify_profile_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
  
  RETURN NEW;
END;
$function$;