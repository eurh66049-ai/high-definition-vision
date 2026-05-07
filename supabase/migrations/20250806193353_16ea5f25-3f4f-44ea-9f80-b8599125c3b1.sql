-- إنشاء جدول الاقتباسات
CREATE TABLE public.quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  quote_text TEXT NOT NULL,
  book_title TEXT NOT NULL,
  author_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- تمكين Row Level Security
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان
-- يمكن للمستخدمين مشاهدة جميع الاقتباسات
CREATE POLICY "Anyone can view quotes" 
ON public.quotes 
FOR SELECT 
USING (true);

-- يمكن للمستخدمين إنشاء اقتباساتهم الخاصة
CREATE POLICY "Users can create their own quotes" 
ON public.quotes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- يمكن للمستخدمين تحديث اقتباساتهم الخاصة
CREATE POLICY "Users can update their own quotes" 
ON public.quotes 
FOR UPDATE 
USING (auth.uid() = user_id);

-- يمكن للمستخدمين حذف اقتباساتهم الخاصة
CREATE POLICY "Users can delete their own quotes" 
ON public.quotes 
FOR DELETE 
USING (auth.uid() = user_id);

-- دالة لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION public.update_quotes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- تريجر لتحديث updated_at
CREATE TRIGGER update_quotes_updated_at
BEFORE UPDATE ON public.quotes
FOR EACH ROW
EXECUTE FUNCTION public.update_quotes_updated_at();

-- فهرس لتحسين الأداء
CREATE INDEX idx_quotes_user_id ON public.quotes(user_id);
CREATE INDEX idx_quotes_created_at ON public.quotes(created_at DESC);