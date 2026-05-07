-- إنشاء دالة لمعالجة المستخدمين الجدد وتحديث صورتهم من Google
CREATE OR REPLACE FUNCTION public.handle_new_user_with_google_avatar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- إنشاء ملف شخصي للمستخدم الجديد
  INSERT INTO public.profiles (
    id,
    username,
    email,
    avatar_url
  ) VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data ->> 'name',
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.email
    ),
    NEW.email,
    -- استخدام صورة Google إذا كانت متوفرة
    CASE 
      WHEN NEW.raw_user_meta_data ->> 'avatar_url' IS NOT NULL 
        OR NEW.raw_user_meta_data ->> 'picture' IS NOT NULL 
      THEN COALESCE(
        NEW.raw_user_meta_data ->> 'avatar_url',
        NEW.raw_user_meta_data ->> 'picture'
      )
      ELSE NULL
    END
  );
  
  RETURN NEW;
END;
$function$;

-- حذف التريغر القديم إذا كان موجوداً
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- إنشاء تريغر جديد لمعالجة المستخدمين الجدد
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_with_google_avatar();