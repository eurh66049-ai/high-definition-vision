-- تصحيح دالة إعادة التعيين الأسبوعية
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
  -- حلقة لجميع التحديات النشطة التي انتهت
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
      challenge_record.id as challenge_id,
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
    WHERE challenge_participants.challenge_id = challenge_record.id 
    AND challenge_participants.is_active = true;
    
    GET DIAGNOSTICS participants_count = ROW_COUNT;
    
    -- تحديث تواريخ التحدي للأسبوع الجديد
    new_start_date := NOW();
    new_end_date := NOW() + INTERVAL '7 days';
    
    UPDATE public.challenges
    SET 
      start_date = new_start_date,
      end_date = new_end_date,
      current_participants = participants_count,
      updated_at = NOW()
    WHERE challenges.id = challenge_record.id;
    
    -- حذف الأنشطة القديمة
    DELETE FROM public.challenge_activities
    WHERE challenge_activities.challenge_id = challenge_record.id;
    
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