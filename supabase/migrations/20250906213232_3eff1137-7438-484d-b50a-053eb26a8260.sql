-- إزالة كلمة "download_read" من حقل الناشر للكتب المرفوعة عبر CSV
UPDATE public.book_submissions 
SET publisher = NULL 
WHERE publisher = 'download_read';