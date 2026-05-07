-- حذف trigger إنشاء meta tags مع CASCADE لحذف التبعيات
DROP TRIGGER IF EXISTS trigger_book_meta_tags ON public.book_submissions CASCADE;

-- حذف الدالة بعد حذف الـ trigger
DROP FUNCTION IF EXISTS public.generate_book_meta_tags() CASCADE;