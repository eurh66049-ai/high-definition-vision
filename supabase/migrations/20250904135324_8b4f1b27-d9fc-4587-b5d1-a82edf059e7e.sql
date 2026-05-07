-- إنشاء RPC function محسّنة لجلب المتصدرين مع معلومات أكثر تفصيلاً
CREATE OR REPLACE FUNCTION public.get_challenge_leaderboard_enhanced(p_challenge_id uuid)
RETURNS TABLE(
  user_id uuid,
  username text,
  avatar_url text,
  current_score integer,
  rank bigint,
  joined_at timestamp with time zone,
  achievements jsonb,
  total_activities integer
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
    ROW_NUMBER() OVER (ORDER BY cp.current_score DESC, cp.joined_at ASC) as rank,
    cp.joined_at,
    cp.achievements,
    COALESCE(
      (SELECT COUNT(*) FROM public.challenge_activities ca 
       WHERE ca.challenge_id = p_challenge_id AND ca.user_id = cp.user_id), 
      0
    )::integer as total_activities
  FROM public.challenge_participants cp
  LEFT JOIN public.profiles p ON cp.user_id = p.id
  WHERE cp.challenge_id = p_challenge_id 
    AND cp.is_active = true
    AND cp.current_score >= 0
  ORDER BY cp.current_score DESC, cp.joined_at ASC;
END;
$$;

-- إنشاء function لاختبار المتصدرين مع جميع البيانات
CREATE OR REPLACE FUNCTION public.test_leaderboard_data(p_challenge_id uuid DEFAULT NULL)
RETURNS TABLE(
  challenge_info jsonb,
  participants_count integer,
  leaderboard_data jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_challenge_id uuid;
  v_challenge_record RECORD;
  v_participants_count integer;
  v_leaderboard jsonb;
BEGIN
  -- إذا لم يتم تمرير معرف التحدي، استخدم تحدي المراجعات النشط
  IF p_challenge_id IS NULL THEN
    SELECT id INTO v_challenge_id
    FROM public.challenges 
    WHERE challenge_type = 'reviews' 
    AND status = 'active' 
    LIMIT 1;
  ELSE
    v_challenge_id := p_challenge_id;
  END IF;
  
  -- جلب معلومات التحدي
  SELECT * INTO v_challenge_record
  FROM public.challenges 
  WHERE id = v_challenge_id;
  
  -- عد المشاركين النشطين
  SELECT COUNT(*) INTO v_participants_count
  FROM public.challenge_participants 
  WHERE challenge_id = v_challenge_id AND is_active = true;
  
  -- جلب بيانات المتصدرين
  SELECT jsonb_agg(
    jsonb_build_object(
      'user_id', user_id,
      'username', username,
      'avatar_url', avatar_url,
      'current_score', current_score,
      'rank', rank,
      'joined_at', joined_at,
      'achievements', achievements,
      'total_activities', total_activities
    )
  ) INTO v_leaderboard
  FROM public.get_challenge_leaderboard_enhanced(v_challenge_id);
  
  RETURN QUERY SELECT 
    jsonb_build_object(
      'id', v_challenge_record.id,
      'title', v_challenge_record.title,
      'challenge_type', v_challenge_record.challenge_type,
      'status', v_challenge_record.status,
      'current_participants', v_challenge_record.current_participants
    ) as challenge_info,
    v_participants_count as participants_count,
    COALESCE(v_leaderboard, '[]'::jsonb) as leaderboard_data;
END;
$$;