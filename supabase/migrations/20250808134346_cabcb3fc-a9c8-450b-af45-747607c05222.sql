-- تصحيح دالة إلغاء الحظر
CREATE OR REPLACE FUNCTION unban_user(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE banned_users 
  SET is_active = false
  WHERE user_id = p_user_id 
    AND is_active = true;
    
  -- Return true if any rows were updated
  RETURN FOUND;
END;
$$;

-- إلغاء حظر المستخدم للاختبار
SELECT unban_user('47fb0419-0273-4756-aa10-b9c03041fe2c');