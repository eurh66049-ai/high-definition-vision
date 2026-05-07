-- إصلاح قيم الـ views والـ rating للكتب التي تحتوي على "00"
UPDATE public.book_submissions 
SET 
  views = CASE WHEN views IS NULL THEN 0 ELSE views END,
  rating = CASE WHEN rating IS NULL THEN 0.0 WHEN rating = 0 THEN 0.0 ELSE rating END
WHERE status = 'approved';

-- تحديث القيم الافتراضية للكتب الجديدة
ALTER TABLE public.book_submissions 
ALTER COLUMN views SET DEFAULT 0,
ALTER COLUMN rating SET DEFAULT 0.0;