-- تحديث جميع الإيميلات الفارغة في profiles من auth.users
UPDATE public.profiles p
SET email = au.email
FROM auth.users au
WHERE p.id = au.id
AND p.email IS NULL
AND au.email IS NOT NULL;

-- إنشاء دالة لمزامنة الإيميل تلقائياً عند إنشاء أو تحديث المستخدم
CREATE OR REPLACE FUNCTION public.sync_profile_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET email = NEW.email
  WHERE id = NEW.id
  AND (email IS NULL OR email <> NEW.email);
  RETURN NEW;
END;
$$;

-- حذف التريجر إذا كان موجوداً
DROP TRIGGER IF EXISTS trg_sync_profile_email ON auth.users;

-- إنشاء تريجر على auth.users لمزامنة الإيميل
CREATE TRIGGER trg_sync_profile_email
AFTER INSERT OR UPDATE OF email ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_email();