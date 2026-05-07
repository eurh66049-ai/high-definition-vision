-- إنشاء جدول عدم الإعجابات
CREATE TABLE public.book_dislikes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(book_id, user_id)
);

-- تفعيل RLS
ALTER TABLE public.book_dislikes ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان
CREATE POLICY "Users can view all dislikes" 
ON public.book_dislikes 
FOR SELECT 
USING (true);

CREATE POLICY "Users can add their own dislikes" 
ON public.book_dislikes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own dislikes" 
ON public.book_dislikes 
FOR DELETE 
USING (auth.uid() = user_id);

-- دالة للحصول على عدد عدم الإعجابات
CREATE OR REPLACE FUNCTION public.get_book_dislikes_count(p_book_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM public.book_dislikes WHERE book_id = p_book_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- دالة للتحقق من عدم إعجاب المستخدم
CREATE OR REPLACE FUNCTION public.check_user_book_dislike(p_book_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.book_dislikes WHERE book_id = p_book_id AND user_id = p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- دالة لتبديل عدم الإعجاب
CREATE OR REPLACE FUNCTION public.toggle_book_dislike(p_book_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_exists BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول أولاً';
  END IF;

  -- التحقق من وجود عدم إعجاب سابق
  SELECT EXISTS (SELECT 1 FROM public.book_dislikes WHERE book_id = p_book_id AND user_id = v_user_id) INTO v_exists;

  IF v_exists THEN
    -- إزالة عدم الإعجاب
    DELETE FROM public.book_dislikes WHERE book_id = p_book_id AND user_id = v_user_id;
    RETURN FALSE;
  ELSE
    -- إزالة الإعجاب إن وجد (لا يمكن إعجاب وعدم إعجاب في نفس الوقت)
    DELETE FROM public.book_likes WHERE book_id = p_book_id AND user_id = v_user_id;
    -- إضافة عدم الإعجاب
    INSERT INTO public.book_dislikes (book_id, user_id) VALUES (p_book_id, v_user_id);
    RETURN TRUE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- تحديث دالة toggle_book_like لإزالة عدم الإعجاب عند الإعجاب
CREATE OR REPLACE FUNCTION public.toggle_book_like(p_book_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_exists BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول أولاً';
  END IF;

  -- التحقق من وجود إعجاب سابق
  SELECT EXISTS (SELECT 1 FROM public.book_likes WHERE book_id = p_book_id AND user_id = v_user_id) INTO v_exists;

  IF v_exists THEN
    -- إزالة الإعجاب
    DELETE FROM public.book_likes WHERE book_id = p_book_id AND user_id = v_user_id;
    RETURN FALSE;
  ELSE
    -- إزالة عدم الإعجاب إن وجد (لا يمكن إعجاب وعدم إعجاب في نفس الوقت)
    DELETE FROM public.book_dislikes WHERE book_id = p_book_id AND user_id = v_user_id;
    -- إضافة الإعجاب
    INSERT INTO public.book_likes (book_id, user_id) VALUES (p_book_id, v_user_id);
    RETURN TRUE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;