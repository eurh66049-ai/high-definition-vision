-- إنشاء دالة لحذف جميع إشعارات المستخدم
CREATE OR REPLACE FUNCTION public.delete_all_user_notifications(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- حذف جميع إشعارات المستخدم
  DELETE FROM public.notifications 
  WHERE user_id = p_user_id;
  
  -- إرجاع عدد الإشعارات المحذوفة
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;