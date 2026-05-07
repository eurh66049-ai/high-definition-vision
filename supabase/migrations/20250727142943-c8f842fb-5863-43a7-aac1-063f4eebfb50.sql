-- إنشاء جدول إعجابات الكتب
CREATE TABLE public.book_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  book_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- منع التكرار لنفس المستخدم ونفس الكتاب
  UNIQUE(user_id, book_id)
);

-- تفعيل RLS
ALTER TABLE public.book_likes ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان
CREATE POLICY "Users can view all book likes" 
ON public.book_likes 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own likes" 
ON public.book_likes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes" 
ON public.book_likes 
FOR DELETE 
USING (auth.uid() = user_id);

-- إنشاء فهرس لتحسين الأداء
CREATE INDEX idx_book_likes_book_id ON public.book_likes(book_id);
CREATE INDEX idx_book_likes_user_id ON public.book_likes(user_id);

-- إنشاء دالة لحساب عدد الإعجابات لكتاب
CREATE OR REPLACE FUNCTION public.get_book_likes_count(p_book_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER 
    FROM public.book_likes 
    WHERE book_id = p_book_id
  );
END;
$$;

-- إنشاء دالة للتحقق من إعجاب المستخدم
CREATE OR REPLACE FUNCTION public.check_user_book_like(p_book_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.book_likes 
    WHERE book_id = p_book_id AND user_id = p_user_id
  );
END;
$$;

-- إنشاء دالة لتبديل الإعجاب
CREATE OR REPLACE FUNCTION public.toggle_book_like(p_book_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_is_liked BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول أولاً';
  END IF;
  
  -- التحقق من الحالة الحالية
  SELECT EXISTS(
    SELECT 1 FROM public.book_likes 
    WHERE user_id = v_user_id AND book_id = p_book_id
  ) INTO v_is_liked;
  
  IF v_is_liked THEN
    -- إزالة الإعجاب
    DELETE FROM public.book_likes 
    WHERE user_id = v_user_id AND book_id = p_book_id;
    RETURN FALSE;
  ELSE
    -- إضافة الإعجاب
    INSERT INTO public.book_likes (user_id, book_id)
    VALUES (v_user_id, p_book_id);
    RETURN TRUE;
  END IF;
END;
$$;