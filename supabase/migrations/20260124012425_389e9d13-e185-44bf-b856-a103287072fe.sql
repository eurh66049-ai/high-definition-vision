-- RPC لجلب حالة المتابعة وطلب المراسلة في استعلام واحد
CREATE OR REPLACE FUNCTION get_user_interaction_status(
  p_current_user_id UUID,
  p_target_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  is_following BOOLEAN := FALSE;
  followers_count_val INT := 0;
  message_request_record RECORD;
  message_request_json JSON := NULL;
BEGIN
  -- التحقق من حالة المتابعة
  SELECT EXISTS(
    SELECT 1 FROM user_followers 
    WHERE follower_id = p_current_user_id 
    AND followed_id = p_target_user_id
  ) INTO is_following;

  -- جلب عدد المتابعين
  SELECT COALESCE(followers_count, 0) INTO followers_count_val
  FROM profiles 
  WHERE id = p_target_user_id;

  -- جلب طلب المراسلة (إن وجد)
  SELECT id, sender_id, receiver_id, status, created_at
  INTO message_request_record
  FROM message_requests
  WHERE (sender_id = p_current_user_id AND receiver_id = p_target_user_id)
     OR (sender_id = p_target_user_id AND receiver_id = p_current_user_id)
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    message_request_json := json_build_object(
      'id', message_request_record.id,
      'sender_id', message_request_record.sender_id,
      'receiver_id', message_request_record.receiver_id,
      'status', message_request_record.status,
      'created_at', message_request_record.created_at,
      'is_sender', message_request_record.sender_id = p_current_user_id
    );
  END IF;

  -- بناء النتيجة النهائية
  result := json_build_object(
    'is_following', is_following,
    'followers_count', followers_count_val,
    'message_request', message_request_json
  );

  RETURN result;
END;
$$;