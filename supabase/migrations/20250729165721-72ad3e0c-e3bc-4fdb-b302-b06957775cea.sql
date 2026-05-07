-- حذف الدوال المكررة والمتضاربة
DROP FUNCTION IF EXISTS public.is_user_following_author(text, text);
DROP FUNCTION IF EXISTS public.toggle_author_follow(text);

-- إنشاء دالة للتحقق من المتابعة بشكل صحيح
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

-- إنشاء دالة لتبديل المتابعة بشكل صحيح
CREATE OR REPLACE FUNCTION public.toggle_author_follow(p_author_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_is_following BOOLEAN;
BEGIN
  -- الحصول على معرف المستخدم المتصل
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول أولاً';
  END IF;
  
  -- التحقق من وجود المؤلف
  IF NOT EXISTS (SELECT 1 FROM public.authors WHERE id = p_author_id) THEN
    RAISE EXCEPTION 'المؤلف غير موجود';
  END IF;
  
  -- التحقق من حالة المتابعة الحالية
  SELECT EXISTS (
    SELECT 1 FROM public.author_followers
    WHERE user_id = v_user_id AND author_id = p_author_id
  ) INTO v_is_following;
  
  IF v_is_following THEN
    -- إلغاء المتابعة
    DELETE FROM public.author_followers
    WHERE user_id = v_user_id AND author_id = p_author_id;
    RETURN FALSE;
  ELSE
    -- إضافة المتابعة
    INSERT INTO public.author_followers (user_id, author_id)
    VALUES (v_user_id, p_author_id)
    ON CONFLICT (user_id, author_id) DO NOTHING;
    RETURN TRUE;
  END IF;
END;
$$;