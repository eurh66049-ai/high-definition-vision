-- إنشاء الإضافة pg_trgm للبحث السريع
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- فهارس عادية لتسريع البحث
CREATE INDEX IF NOT EXISTS idx_book_submissions_status ON public.book_submissions(status);
CREATE INDEX IF NOT EXISTS idx_book_submissions_status_title ON public.book_submissions(status, title);
CREATE INDEX IF NOT EXISTS idx_book_submissions_status_author ON public.book_submissions(status, author);

-- فهرس مركب للكتب المعتمدة فقط
CREATE INDEX IF NOT EXISTS idx_book_submissions_approved ON public.book_submissions(status) 
WHERE status = 'approved';