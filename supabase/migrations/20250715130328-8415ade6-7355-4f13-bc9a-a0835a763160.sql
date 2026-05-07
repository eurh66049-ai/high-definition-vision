-- إصلاح trigger link_book_to_author الذي يحاول الوصول إلى author_id غير موجود
DROP TRIGGER IF EXISTS link_book_to_author_trigger ON public.book_submissions;

-- إعادة إنشاء الدالة مع إصلاح المشكلة
CREATE OR REPLACE FUNCTION public.link_book_to_author()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_author_id UUID;
  v_user_profile_exists BOOLEAN;
BEGIN
  -- التحقق من وجود المستخدم في جدول profiles
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = NEW.user_id) 
  INTO v_user_profile_exists;
  
  -- البحث عن المؤلف بالاسم أولاً
  SELECT id INTO v_author_id 
  FROM public.authors 
  WHERE LOWER(TRIM(name)) = LOWER(TRIM(NEW.author))
  LIMIT 1;
  
  -- إذا لم يتم العثور على المؤلف، قم بإنشاؤه
  IF v_author_id IS NULL THEN
    INSERT INTO public.authors (
      name, 
      bio, 
      avatar_url, 
      website,
      user_id
    ) VALUES (
      NEW.author,
      NEW.author_bio,
      NEW.author_image_url,
      NEW.author_website,
      CASE WHEN v_user_profile_exists THEN NEW.user_id ELSE NULL END
    ) RETURNING id INTO v_author_id;
  ELSE
    -- تحديث بيانات المؤلف إذا كانت فارغة (فقط إذا كان المستخدم موجود في profiles)
    IF v_user_profile_exists THEN
      UPDATE public.authors 
      SET 
        bio = COALESCE(NULLIF(bio, ''), NEW.author_bio, bio),
        avatar_url = COALESCE(NULLIF(avatar_url, ''), NEW.author_image_url, avatar_url),
        website = COALESCE(NULLIF(website, ''), NEW.author_website, website),
        user_id = COALESCE(user_id, NEW.user_id)
      WHERE id = v_author_id;
    END IF;
  END IF;
  
  -- لا نحتاج لربط author_id في book_submissions لأن الحقل غير موجود
  -- المؤلف مربوط بالاسم فقط
  
  RETURN NEW;
END;
$function$;

-- إعادة إنشاء الـ trigger
CREATE TRIGGER link_book_to_author_trigger
BEFORE INSERT OR UPDATE ON public.book_submissions
FOR EACH ROW
EXECUTE FUNCTION public.link_book_to_author();