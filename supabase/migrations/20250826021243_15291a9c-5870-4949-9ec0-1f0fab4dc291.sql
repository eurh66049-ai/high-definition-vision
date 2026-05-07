-- Fix slugs for Agatha Christie books - correct غ to ج
UPDATE public.book_submissions 
SET slug = REPLACE(slug, 'أغاثا', 'أجاثا')
WHERE author = 'أجاثا كريستي' 
  AND slug LIKE '%أغاثا%'
  AND status = 'approved';