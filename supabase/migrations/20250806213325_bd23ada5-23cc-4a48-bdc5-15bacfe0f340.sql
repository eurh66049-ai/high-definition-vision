-- إنشاء جدول إعجابات الاقتباسات
CREATE TABLE public.quote_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- منع الإعجاب المزدوج من نفس المستخدم
  UNIQUE(quote_id, user_id)
);

-- تمكين RLS
ALTER TABLE public.quote_likes ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان
CREATE POLICY "Users can add their own quote likes" 
ON public.quote_likes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own quote likes" 
ON public.quote_likes 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Everyone can view quote likes" 
ON public.quote_likes 
FOR SELECT 
USING (true);

-- إنشاء فهرس للاستعلامات السريعة
CREATE INDEX idx_quote_likes_quote_id ON public.quote_likes(quote_id);
CREATE INDEX idx_quote_likes_user_id ON public.quote_likes(user_id);