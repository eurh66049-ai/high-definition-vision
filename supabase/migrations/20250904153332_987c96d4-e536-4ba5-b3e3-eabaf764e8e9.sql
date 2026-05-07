-- حذف الدالة الموجودة وإعادة إنشائها
DROP FUNCTION IF EXISTS public.get_challenge_leaderboard_enhanced(uuid);

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