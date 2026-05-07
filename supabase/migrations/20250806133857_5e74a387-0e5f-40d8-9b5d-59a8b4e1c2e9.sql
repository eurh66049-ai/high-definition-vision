-- حذف الدوال والتريجرز المكررة التي تسبب إشعارات مكررة
DROP TRIGGER IF EXISTS notify_profile_avatar_update_trigger ON public.profiles;
DROP TRIGGER IF EXISTS notify_profile_username_update_trigger ON public.profiles;
DROP TRIGGER IF EXISTS notify_profile_updates_trigger ON public.profiles;

-- حذف الدوال القديمة المكررة
DROP FUNCTION IF EXISTS public.notify_profile_avatar_update();
DROP FUNCTION IF EXISTS public.notify_profile_username_update();
DROP FUNCTION IF EXISTS public.notify_profile_updates();

-- التأكد من وجود دالة واحدة فقط محسنة مع منع التكرار
CREATE OR REPLACE FUNCTION public.notify_comprehensive_profile_updates()
RETURNS TRIGGER AS $$
BEGIN
  -- إرسال إشعار لتحديث صورة الحساب مع منع التكرار
  IF OLD.avatar_url IS DISTINCT FROM NEW.avatar_url THEN
    -- التحقق من عدم وجود إشعار مماثل في آخر دقيقة
    IF NOT EXISTS (
      SELECT 1 FROM public.notifications 
      WHERE user_id = NEW.id 
        AND title = 'تم تحديث صورة الحساب ✅'
        AND created_at > NOW() - INTERVAL '1 minute'
    ) THEN
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
  END IF;
  
  -- إرسال إشعار لتحديث اسم المستخدم مع منع التكرار
  IF OLD.username IS DISTINCT FROM NEW.username THEN
    -- التحقق من عدم وجود إشعار مماثل في آخر دقيقة
    IF NOT EXISTS (
      SELECT 1 FROM public.notifications 
      WHERE user_id = NEW.id 
        AND title = 'تم تحديث اسم المستخدم ✅'
        AND created_at > NOW() - INTERVAL '1 minute'
    ) THEN
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
  END IF;
  
  -- إرسال إشعار لتحديث الجنس مع منع التكرار
  IF OLD.gender IS DISTINCT FROM NEW.gender AND NEW.gender IS NOT NULL THEN
    -- التحقق من عدم وجود إشعار مماثل في آخر دقيقة
    IF NOT EXISTS (
      SELECT 1 FROM public.notifications 
      WHERE user_id = NEW.id 
        AND title = 'تم تحديث بيانات الجنس ✅'
        AND created_at > NOW() - INTERVAL '1 minute'
    ) THEN
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
  END IF;
  
  -- إرسال إشعار لتحديث الدولة مع منع التكرار
  IF OLD.country_code IS DISTINCT FROM NEW.country_code THEN
    -- التحقق من عدم وجود إشعار مماثل في آخر دقيقة
    IF NOT EXISTS (
      SELECT 1 FROM public.notifications 
      WHERE user_id = NEW.id 
        AND title = 'تم تحديث بيانات الدولة ✅'
        AND created_at > NOW() - INTERVAL '1 minute'
    ) THEN
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
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- التأكد من وجود تريجر واحد فقط
DROP TRIGGER IF EXISTS notify_comprehensive_profile_updates_trigger ON public.profiles;

CREATE TRIGGER notify_comprehensive_profile_updates_trigger
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_comprehensive_profile_updates();

-- حذف الإشعارات المكررة الموجودة بالفعل
WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY user_id, title, message, DATE(created_at)
           ORDER BY created_at DESC
         ) as rn
  FROM public.notifications
  WHERE title IN (
    'تم تحديث صورة الحساب ✅',
    'تم تحديث اسم المستخدم ✅',
    'تم تحديث بيانات الجنس ✅',
    'تم تحديث بيانات الدولة ✅'
  )
)
DELETE FROM public.notifications 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);