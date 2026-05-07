-- تمكين الـ real-time updates لجدول book_reviews
ALTER TABLE public.book_reviews REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.book_reviews;