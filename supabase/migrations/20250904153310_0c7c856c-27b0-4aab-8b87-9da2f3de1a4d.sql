-- إنشاء دالة لإعادة تعيين التحديات الأسبوعية
CREATE OR REPLACE FUNCTION public.reset_weekly_challenges()
RETURNS TABLE(
  challenge_id UUID,
  winners_saved INTEGER,
  participants_reset INTEGER
) 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE
  challenge_record RECORD;
  winners_count INTEGER;
  participants_count INTEGER;
  today_date DATE := CURRENT_DATE;
  new_start_date TIMESTAMP WITH TIME ZONE;
  new_end_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- حلقة لجميع التحديات النشطة
  FOR challenge_record IN 
    SELECT * FROM public.challenges 
    WHERE status = 'active' 
    AND end_date < NOW()
  LOOP
    -- حفظ الفائزين قبل إعادة التعيين
    INSERT INTO public.challenge_reward_distributions (
      challenge_id,
      user_id,
      user_position,
      followers_added,
      book_reads_added,
      distributed_at
    )
    SELECT 
      challenge_record.id,
      cp.user_id,
      ROW_NUMBER() OVER (ORDER BY cp.current_score DESC) as position,
      CASE 
        WHEN ROW_NUMBER() OVER (ORDER BY cp.current_score DESC) = 1 THEN 500
        WHEN ROW_NUMBER() OVER (ORDER BY cp.current_score DESC) = 2 THEN 300
        WHEN ROW_NUMBER() OVER (ORDER BY cp.current_score DESC) = 3 THEN 100
        ELSE 0
      END as followers_added,
      CASE 
        WHEN ROW_NUMBER() OVER (ORDER BY cp.current_score DESC) = 1 THEN 1000
        WHEN ROW_NUMBER() OVER (ORDER BY cp.current_score DESC) = 2 THEN 700
        WHEN ROW_NUMBER() OVER (ORDER BY cp.current_score DESC) = 3 THEN 500
        ELSE 0
      END as book_reads_added,
      NOW()
    FROM public.challenge_participants cp
    WHERE cp.challenge_id = challenge_record.id 
    AND cp.is_active = true
    AND cp.current_score > 0
    ORDER BY cp.current_score DESC
    LIMIT 10;
    
    GET DIAGNOSTICS winners_count = ROW_COUNT;
    
    -- إعادة تعيين نقاط المشاركين
    UPDATE public.challenge_participants 
    SET 
      current_score = 0,
      achievements = '[]'::jsonb,
      joined_at = NOW()
    WHERE challenge_id = challenge_record.id 
    AND is_active = true;
    
    GET DIAGNOSTICS participants_count = ROW_COUNT;
    
    -- تحديث تواريخ التحدي للأسبوع الجديد
    new_start_date := NOW();
    new_end_date := NOW() + INTERVAL '7 days';
    
    UPDATE public.challenges
    SET 
      start_date = new_start_date,
      end_date = new_end_date,
      current_participants = 0,
      updated_at = NOW()
    WHERE id = challenge_record.id;
    
    -- حذف الأنشطة القديمة
    DELETE FROM public.challenge_activities
    WHERE challenge_id = challenge_record.id;
    
    -- إرجاع النتائج
    RETURN QUERY SELECT 
      challenge_record.id,
      winners_count,
      participants_count;
  END LOOP;
  
  -- تفعيل التحديات القادمة التي حان موعدها
  UPDATE public.challenges
  SET 
    status = 'active',
    start_date = NOW(),
    end_date = NOW() + INTERVAL '7 days',
    updated_at = NOW()
  WHERE status = 'upcoming' 
  AND start_date <= NOW();
  
END;
$$;

-- إنشاء دالة تحديث نقاط التحدي
CREATE OR REPLACE FUNCTION public.update_challenge_score(
  p_challenge_id UUID,
  p_user_id UUID,
  p_activity_type TEXT,
  p_points INTEGER,
  p_activity_data JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE
  v_challenge_exists BOOLEAN;
  v_participant_exists BOOLEAN;
BEGIN
  -- التحقق من وجود التحدي
  SELECT EXISTS(
    SELECT 1 FROM public.challenges 
    WHERE id = p_challenge_id AND status = 'active'
  ) INTO v_challenge_exists;
  
  IF NOT v_challenge_exists THEN
    RETURN FALSE;
  END IF;
  
  -- التحقق من اشتراك المستخدم
  SELECT EXISTS(
    SELECT 1 FROM public.challenge_participants 
    WHERE challenge_id = p_challenge_id AND user_id = p_user_id AND is_active = true
  ) INTO v_participant_exists;
  
  IF NOT v_participant_exists THEN
    RETURN FALSE;
  END IF;
  
  -- تسجيل النشاط
  INSERT INTO public.challenge_activities (
    challenge_id,
    user_id,
    activity_type,
    points,
    activity_data,
    created_at
  ) VALUES (
    p_challenge_id,
    p_user_id,
    p_activity_type,
    p_points,
    p_activity_data,
    NOW()
  );
  
  -- تحديث نقاط المشارك
  UPDATE public.challenge_participants
  SET 
    current_score = current_score + p_points,
    achievements = achievements || jsonb_build_object(
      'activity_type', p_activity_type,
      'points', p_points,
      'timestamp', NOW()
    )
  WHERE challenge_id = p_challenge_id AND user_id = p_user_id;
  
  RETURN TRUE;
END;
$$;

-- إنشاء دالة للحصول على لوحة المتصدرين المحسنة
CREATE OR REPLACE FUNCTION public.get_challenge_leaderboard_enhanced(p_challenge_id UUID)
RETURNS TABLE(
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  current_score INTEGER,
  rank INTEGER,
  joined_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cp.user_id,
    COALESCE(p.username, p.email, 'مستخدم مجهول') as username,
    p.avatar_url,
    cp.current_score,
    ROW_NUMBER() OVER (ORDER BY cp.current_score DESC, cp.joined_at ASC)::INTEGER as rank,
    cp.joined_at
  FROM public.challenge_participants cp
  LEFT JOIN public.profiles p ON cp.user_id = p.id
  WHERE cp.challenge_id = p_challenge_id 
  AND cp.is_active = true
  ORDER BY cp.current_score DESC, cp.joined_at ASC
  LIMIT 50;
END;
$$;