-- تعطيل trigger إنشاء meta tags مؤقتاً لحل مشكلة رفع الكتب
DROP TRIGGER IF EXISTS trigger_generate_book_meta_tags ON public.book_submissions;

-- إزالة الدالة المرتبطة بـ trigger إنشاء meta tags
DROP FUNCTION IF EXISTS public.generate_book_meta_tags();