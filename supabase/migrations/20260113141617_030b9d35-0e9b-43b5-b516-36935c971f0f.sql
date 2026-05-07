-- جدول لتخزين النص المستخرج من ملفات PDF للكتب
CREATE TABLE IF NOT EXISTS public.book_extracted_text (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL UNIQUE,
  extracted_text TEXT,
  text_length INTEGER,
  extraction_status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  extraction_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- فهرس على book_id للبحث السريع
CREATE INDEX IF NOT EXISTS idx_book_extracted_text_book_id ON public.book_extracted_text(book_id);

-- فهرس على حالة الاستخراج
CREATE INDEX IF NOT EXISTS idx_book_extracted_text_status ON public.book_extracted_text(extraction_status);

-- تفعيل RLS
ALTER TABLE public.book_extracted_text ENABLE ROW LEVEL SECURITY;

-- سياسة للقراءة العامة (للمساعد)
CREATE POLICY "Anyone can read book text" 
ON public.book_extracted_text 
FOR SELECT 
USING (true);

-- سياسة للإدراج والتحديث (للنظام فقط)
CREATE POLICY "Service can insert book text"
ON public.book_extracted_text
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service can update book text"
ON public.book_extracted_text
FOR UPDATE
USING (true);

-- دالة للحصول على النص المستخرج للكتاب
CREATE OR REPLACE FUNCTION public.get_book_extracted_text(p_book_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT extracted_text
  FROM public.book_extracted_text
  WHERE book_id = p_book_id
    AND extraction_status = 'completed'
  LIMIT 1;
$$;

-- دالة لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION public.update_book_text_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- تريجر لتحديث updated_at
DROP TRIGGER IF EXISTS update_book_extracted_text_updated_at ON public.book_extracted_text;
CREATE TRIGGER update_book_extracted_text_updated_at
BEFORE UPDATE ON public.book_extracted_text
FOR EACH ROW
EXECUTE FUNCTION public.update_book_text_updated_at();