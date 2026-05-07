
-- إضافة دالة لحذف إشعار معين للمستخدم
CREATE OR REPLACE FUNCTION public.delete_user_notification(p_notification_id uuid, p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- حذف الإشعار إذا كان يخص المستخدم المحدد
  DELETE FROM public.notifications 
  WHERE id = p_notification_id AND user_id = p_user_id;
  
  -- إرجاع true إذا تم الحذف بنجاح
  RETURN FOUND;
END;
$function$
