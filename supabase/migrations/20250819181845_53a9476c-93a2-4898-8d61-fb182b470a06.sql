-- إضافة حقل bio إلى جدول profiles للمؤلفين
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;

-- تحديث function لتحديث بيانات المؤلف في جدول authors عند تحديث البروفايل
CREATE OR REPLACE FUNCTION public.sync_author_bio_from_profiles()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- تحديث bio في جدول authors عند تحديث bio في profiles
  UPDATE public.authors 
  SET 
    bio = NEW.bio,
    avatar_url = COALESCE(NEW.avatar_url, avatar_url)
  WHERE 
    user_id = NEW.id;
  
  -- تحديث author_bio في جميع الكتب لهذا المؤلف إذا كان لديه مؤلف في جدول authors
  UPDATE public.book_submissions 
  SET 
    author_bio = NEW.bio
  WHERE 
    author IN (
      SELECT name FROM public.authors WHERE user_id = NEW.id
    )
    AND status = 'approved';
  
  RETURN NEW;
END;
$function$;

-- إنشاء trigger لتحديث bio في authors عند تحديث profiles
DROP TRIGGER IF EXISTS trigger_sync_author_bio_from_profiles ON public.profiles;
CREATE TRIGGER trigger_sync_author_bio_from_profiles
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (OLD.bio IS DISTINCT FROM NEW.bio OR OLD.avatar_url IS DISTINCT FROM NEW.avatar_url)
  EXECUTE FUNCTION public.sync_author_bio_from_profiles();