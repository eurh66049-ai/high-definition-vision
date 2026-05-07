-- دالة لتحديث slugs للكتب المعتمدة
CREATE OR REPLACE FUNCTION public.update_approved_book_slugs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- تحديث الـ slugs للكتب المعتمدة التي لا تحتوي على slug
  UPDATE public.book_submissions 
  SET slug = public.generate_book_slug(title, author)
  WHERE status = 'approved' 
    AND (slug IS NULL OR slug = '');
END;
$$;

-- تنفيذ الدالة
SELECT public.update_approved_book_slugs();