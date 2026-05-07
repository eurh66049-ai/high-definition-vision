-- إضافة index مركب لتسريع استعلامات الكتب المعتمدة مع الترتيب
CREATE INDEX IF NOT EXISTS idx_book_submissions_approved_optimized 
ON public.book_submissions (status, created_at DESC, id) 
WHERE status = 'approved';

-- إضافة index للـ cover_image_url المحسّن
CREATE INDEX IF NOT EXISTS idx_book_submissions_cover_optimized
ON public.book_submissions (id, cover_image_url)
WHERE status = 'approved' AND cover_image_url IS NOT NULL;

-- تحسين استعلامات الإحصائيات
CREATE INDEX IF NOT EXISTS idx_book_reviews_book_stats
ON public.book_reviews (book_id, rating);

-- تحليل الجداول لتحديث الإحصائيات
ANALYZE public.book_submissions;
ANALYZE public.book_reviews;