-- إصلاح دالة التحقق من الأدمن لتعمل مع البريد الإلكتروني أيضاً
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_email TEXT;
BEGIN
  -- جلب البريد الإلكتروني للمستخدم الحالي
  SELECT email INTO current_email
  FROM auth.users
  WHERE id = auth.uid();
  
  -- التحقق من أن المستخدم admin بناءً على user_id أو email
  RETURN EXISTS (
    SELECT 1 
    FROM admin_users 
    WHERE (user_id = auth.uid() OR email = current_email)
    AND is_active = true
  );
END;
$$;