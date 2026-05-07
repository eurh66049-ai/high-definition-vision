-- تشغيل يدوي لمزامنة بيانات المؤلف رؤوف بوقفة
UPDATE public.book_submissions 
SET 
  author_bio = (SELECT bio FROM public.authors WHERE name = 'رؤوف بوقفة'),
  author_image_url = COALESCE(
    (SELECT avatar_url FROM public.authors WHERE name = 'رؤوف بوقفة'), 
    author_image_url
  )
WHERE 
  LOWER(TRIM(author)) = LOWER(TRIM('رؤوف بوقفة'))
  AND status = 'approved';