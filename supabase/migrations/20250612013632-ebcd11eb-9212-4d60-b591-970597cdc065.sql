
-- إضافة الأعمدة المفقودة في جدول approved_books
ALTER TABLE public.approved_books 
ADD COLUMN IF NOT EXISTS publisher text,
ADD COLUMN IF NOT EXISTS translator text;
