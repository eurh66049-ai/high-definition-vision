-- إنشاء دالة لزيادة عدد المشاهدات للكتاب
CREATE OR REPLACE FUNCTION public.increment_book_views(p_book_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- زيادة عدد المشاهدات للكتاب في جدول book_submissions
  UPDATE public.book_submissions 
  SET views = COALESCE(views, 0) + 1
  WHERE id = p_book_id AND status = 'approved';
END;
$$;