-- تحديث جدول الاقتباسات ليرتبط بالكتب الموجودة
ALTER TABLE public.quotes 
ADD COLUMN book_id UUID REFERENCES public.book_submissions(id),
ADD COLUMN book_cover_url TEXT,
ADD COLUMN book_author TEXT,
ADD COLUMN book_category TEXT;

-- إنشاء index للبحث السريع
CREATE INDEX idx_quotes_book_id ON public.quotes(book_id);
CREATE INDEX idx_quotes_user_id ON public.quotes(user_id);

-- تحديث الـ RLS policies لتسمح بجلب معلومات المستخدم
DROP POLICY IF EXISTS "Anyone can view quotes" ON public.quotes;
CREATE POLICY "Anyone can view quotes with user info" ON public.quotes
FOR SELECT USING (true);