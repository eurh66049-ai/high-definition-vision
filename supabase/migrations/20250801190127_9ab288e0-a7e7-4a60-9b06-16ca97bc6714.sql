-- تحديث دالة get_user_notifications_stats لحل مشكلة عدد الكتب
CREATE OR REPLACE FUNCTION public.get_user_notifications_stats(p_user_id uuid)
RETURNS TABLE(
  total_notifications integer,
  unread_notifications integer,
  pending_books integer,
  approved_books integer,
  rejected_books integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY 
  SELECT 
    (SELECT COUNT(*)::integer FROM public.notifications WHERE user_id = p_user_id),
    (SELECT COUNT(*)::integer FROM public.notifications WHERE user_id = p_user_id AND read = false),
    (SELECT COUNT(*)::integer FROM public.book_submissions WHERE user_id = p_user_id AND status = 'pending'),
    (SELECT COUNT(*)::integer FROM public.book_submissions WHERE user_id = p_user_id AND status = 'approved'),
    (SELECT COUNT(*)::integer FROM public.book_submissions WHERE user_id = p_user_id AND status = 'rejected');
END;
$$;