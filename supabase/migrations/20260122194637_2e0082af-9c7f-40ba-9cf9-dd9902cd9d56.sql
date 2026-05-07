-- إنشاء جدول لمتابعة المستخدمين العاديين
CREATE TABLE IF NOT EXISTS public.user_followers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

-- تمكين RLS
ALTER TABLE public.user_followers ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان
CREATE POLICY "Anyone can view user followers" 
ON public.user_followers 
FOR SELECT 
USING (true);

CREATE POLICY "Users can follow other users" 
ON public.user_followers 
FOR INSERT 
WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow" 
ON public.user_followers 
FOR DELETE 
USING (auth.uid() = follower_id);

-- إضافة عمود عدد المتابعين لجدول profiles إذا لم يكن موجوداً
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS followers_count integer DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS following_count integer DEFAULT 0;

-- دالة لتبديل حالة المتابعة للمستخدمين
CREATE OR REPLACE FUNCTION public.toggle_user_follow(p_following_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_follower_id UUID;
  v_is_following BOOLEAN;
BEGIN
  -- الحصول على معرف المستخدم المتصل
  v_follower_id := auth.uid();
  
  IF v_follower_id IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول أولاً';
  END IF;
  
  -- التحقق من أن المستخدم لا يتابع نفسه
  IF v_follower_id = p_following_id THEN
    RAISE EXCEPTION 'لا يمكنك متابعة نفسك';
  END IF;
  
  -- التحقق من وجود المستخدم المستهدف
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_following_id) THEN
    RAISE EXCEPTION 'المستخدم غير موجود';
  END IF;
  
  -- التحقق من حالة المتابعة الحالية
  SELECT EXISTS (
    SELECT 1 FROM public.user_followers
    WHERE follower_id = v_follower_id AND following_id = p_following_id
  ) INTO v_is_following;
  
  IF v_is_following THEN
    -- إلغاء المتابعة
    DELETE FROM public.user_followers
    WHERE follower_id = v_follower_id AND following_id = p_following_id;
    
    -- تحديث عدد المتابعين
    UPDATE public.profiles SET followers_count = GREATEST(0, COALESCE(followers_count, 0) - 1) WHERE id = p_following_id;
    UPDATE public.profiles SET following_count = GREATEST(0, COALESCE(following_count, 0) - 1) WHERE id = v_follower_id;
    
    RETURN FALSE;
  ELSE
    -- إضافة المتابعة
    INSERT INTO public.user_followers (follower_id, following_id)
    VALUES (v_follower_id, p_following_id)
    ON CONFLICT (follower_id, following_id) DO NOTHING;
    
    -- تحديث عدد المتابعين
    UPDATE public.profiles SET followers_count = COALESCE(followers_count, 0) + 1 WHERE id = p_following_id;
    UPDATE public.profiles SET following_count = COALESCE(following_count, 0) + 1 WHERE id = v_follower_id;
    
    RETURN TRUE;
  END IF;
END;
$$;