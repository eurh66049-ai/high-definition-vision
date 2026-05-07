-- إزالة قيد المفتاح الخارجي إذا كان موجوداً
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'book_reviews_book_id_fkey'
        AND table_name = 'book_reviews'
    ) THEN
        ALTER TABLE public.book_reviews DROP CONSTRAINT book_reviews_book_id_fkey;
    END IF;
END $$;

-- التأكد من تمكين real-time للتقييمات
ALTER TABLE public.book_reviews REPLICA IDENTITY FULL;

-- إضافة التقييمات إلى النشر للحصول على التحديثات المباشرة
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'book_reviews'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.book_reviews;
    END IF;
END $$;