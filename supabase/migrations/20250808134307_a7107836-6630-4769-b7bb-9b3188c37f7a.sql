-- إلغاء الحظر المؤقت المنتهي الصلاحية للمستخدمين المحظورين
UPDATE banned_users 
SET is_active = false 
WHERE ban_type = 'temporary' 
  AND expires_at IS NOT NULL 
  AND expires_at < NOW() 
  AND is_active = true;

-- دالة لإلغاء الحظر يدوياً (للاختبار)
CREATE OR REPLACE FUNCTION unban_user(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE banned_users 
  SET is_active = false,
      updated_at = NOW()
  WHERE user_id = p_user_id 
    AND is_active = true;
    
  -- Return true if any rows were updated
  RETURN FOUND;
END;
$$;