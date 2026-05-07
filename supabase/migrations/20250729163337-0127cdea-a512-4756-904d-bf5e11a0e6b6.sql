-- إنشاء trigger لتحديث عدد المتابعين تلقائياً
CREATE OR REPLACE FUNCTION public.update_author_followers_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- زيادة عدد المتابعين
    UPDATE public.authors 
    SET followers_count = followers_count + 1 
    WHERE id = NEW.author_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- تقليل عدد المتابعين
    UPDATE public.authors 
    SET followers_count = GREATEST(followers_count - 1, 0) 
    WHERE id = OLD.author_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger على جدول author_followers
DROP TRIGGER IF EXISTS update_followers_count_trigger ON author_followers;
CREATE TRIGGER update_followers_count_trigger
  AFTER INSERT OR DELETE ON author_followers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_author_followers_count();

-- التأكد من وجود دالة toggle_author_follow وإعادة إنشاؤها إذا لزم الأمر
CREATE OR REPLACE FUNCTION public.toggle_author_follow(p_author_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  is_following BOOLEAN;
BEGIN
  -- التحقق من المستخدم المتصل
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول أولاً';
  END IF;
  
  -- التحقق من الحالة الحالية
  SELECT EXISTS(
    SELECT 1 FROM public.author_followers 
    WHERE user_id = v_user_id AND author_id = p_author_id
  ) INTO is_following;
  
  IF is_following THEN
    -- إلغاء المتابعة
    DELETE FROM public.author_followers 
    WHERE user_id = v_user_id AND author_id = p_author_id;
    RETURN FALSE;
  ELSE
    -- إضافة المتابعة
    INSERT INTO public.author_followers (user_id, author_id)
    VALUES (v_user_id, p_author_id);
    RETURN TRUE;
  END IF;
END;
$$;

-- التأكد من وجود دالة is_user_following_author
CREATE OR REPLACE FUNCTION public.is_user_following_author(p_user_id uuid, p_author_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.author_followers 
    WHERE user_id = p_user_id AND author_id = p_author_id
  );
END;
$$;