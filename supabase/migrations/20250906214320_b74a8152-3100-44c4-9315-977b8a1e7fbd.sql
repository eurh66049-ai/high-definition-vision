-- حذف جميع الكتب في قائمة الانتظار
DELETE FROM public.book_submissions WHERE status = 'pending';