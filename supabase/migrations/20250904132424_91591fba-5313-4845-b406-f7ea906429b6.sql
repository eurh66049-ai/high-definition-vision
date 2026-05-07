-- حذف الدالة الموجودة وإعادة إنشائها
DROP FUNCTION IF EXISTS public.update_challenge_score(uuid,uuid,text,integer,jsonb);

-- إنشاء وظيفة تحديث نقاط التحدي
CREATE OR REPLACE FUNCTION public.update_challenge_score(
  p_challenge_id uuid,
  p_user_id uuid,
  p_activity_type text,
  p_points integer,
  p_activity_data jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- التحقق من أن المستخدم مشترك في التحدي
  IF NOT EXISTS (
    SELECT 1 FROM public.challenge_participants 
    WHERE challenge_id = p_challenge_id 
    AND user_id = p_user_id 
    AND is_active = true
  ) THEN
    RETURN;
  END IF;

  -- إضافة النشاط
  INSERT INTO public.challenge_activities (
    challenge_id,
    user_id,
    activity_type,
    points,
    activity_data
  ) VALUES (
    p_challenge_id,
    p_user_id,
    p_activity_type,
    p_points,
    p_activity_data
  );

  -- تحديث النقاط الإجمالية للمشارك
  UPDATE public.challenge_participants
  SET 
    current_score = current_score + p_points,
    achievements = CASE 
      WHEN (current_score + p_points) >= 100 THEN 
        achievements || '["المستوى الأول"]'::jsonb
      ELSE achievements 
    END
  WHERE challenge_id = p_challenge_id AND user_id = p_user_id;
END;
$function$;