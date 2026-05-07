-- إصلاح خطأ syntax وإنشاء نظام الجوائز المحسن

-- إزالة الدوال المكررة أولاً
DROP FUNCTION IF EXISTS public.get_challenge_leaderboard(uuid);
DROP FUNCTION IF EXISTS public.update_challenge_score(uuid, uuid, text, integer, jsonb);
DROP FUNCTION IF EXISTS public.distribute_challenge_rewards(uuid);

-- إنشاء دالة get_challenge_leaderboard محسنة
CREATE OR REPLACE FUNCTION public.get_challenge_leaderboard(p_challenge_id uuid)
RETURNS TABLE(
  user_id uuid, 
  username text, 
  avatar_url text, 
  current_score integer, 
  rank integer,
  joined_at timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT 
    cp.user_id,
    COALESCE(p.username, p.email, 'مستخدم مجهول') AS username,
    p.avatar_url,
    cp.current_score,
    RANK() OVER (ORDER BY cp.current_score DESC, cp.joined_at ASC) AS rank,
    cp.joined_at
  FROM public.challenge_participants cp
  LEFT JOIN public.profiles p ON p.id = cp.user_id
  WHERE cp.challenge_id = p_challenge_id 
    AND cp.is_active = true
  ORDER BY cp.current_score DESC, cp.joined_at ASC
  LIMIT 50;
$$;

-- إنشاء دالة update_challenge_score محسنة
CREATE OR REPLACE FUNCTION public.update_challenge_score(
  p_challenge_id uuid,
  p_user_id uuid,
  p_activity_type text,
  p_points integer,
  p_activity_data jsonb DEFAULT '{}'::jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_participation_exists boolean;
BEGIN
  -- التحقق من وجود المشاركة
  SELECT EXISTS(
    SELECT 1 FROM public.challenge_participants 
    WHERE challenge_id = p_challenge_id 
      AND user_id = p_user_id 
      AND is_active = true
  ) INTO v_participation_exists;
  
  IF NOT v_participation_exists THEN
    RETURN false;
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
  
  -- تحديث النقاط الإجمالية والإنجازات
  UPDATE public.challenge_participants
  SET 
    current_score = current_score + p_points,
    achievements = CASE 
      WHEN current_score + p_points >= 100 AND NOT (achievements ? 'first_hundred') THEN
        achievements || jsonb_build_object('first_hundred', jsonb_build_object(
          'name', 'أول مائة نقطة',
          'icon', '🎯',
          'earned_at', NOW()
        ))
      ELSE achievements
    END
  WHERE challenge_id = p_challenge_id AND user_id = p_user_id;
  
  RETURN true;
END;
$$;

-- تحديث جدول challenge_rewards لنظام الجوائز الجديد
ALTER TABLE public.challenge_rewards 
ADD COLUMN IF NOT EXISTS reward_type text DEFAULT 'social_boost';

ALTER TABLE public.challenge_rewards 
ADD COLUMN IF NOT EXISTS followers_count integer DEFAULT 0;

ALTER TABLE public.challenge_rewards 
ADD COLUMN IF NOT EXISTS book_reads_count integer DEFAULT 0;

-- تحديث الجوائز الموجودة لتكون متابعين وقراءات
UPDATE public.challenge_rewards 
SET 
  reward_type = 'social_boost',
  followers_count = CASE 
    WHEN "position" = 1 THEN 500
    WHEN "position" = 2 THEN 300
    WHEN "position" = 3 THEN 100
    ELSE 50
  END,
  book_reads_count = CASE 
    WHEN "position" = 1 THEN 1000
    WHEN "position" = 2 THEN 700
    WHEN "position" = 3 THEN 500
    ELSE 200
  END,
  reward_title = CASE 
    WHEN "position" = 1 THEN 'جائزة المركز الأول 🥇'
    WHEN "position" = 2 THEN 'جائزة المركز الثاني 🥈'
    WHEN "position" = 3 THEN 'جائزة المركز الثالث 🥉'
    ELSE 'جائزة المشاركة 🏅'
  END,
  reward_description = CASE 
    WHEN "position" = 1 THEN 'احصل على 500 متابع جديد و 1000 قراءة إضافية لكتابك المفضل!'
    WHEN "position" = 2 THEN 'احصل على 300 متابع جديد و 700 قراءة إضافية لكتابك المفضل!'
    WHEN "position" = 3 THEN 'احصل على 100 متابع جديد و 500 قراءة إضافية لكتابك المفضل!'
    ELSE 'احصل على 50 متابع جديد و 200 قراءة إضافية لكتابك المفضل!'
  END
WHERE reward_title IS NULL OR reward_title = '' OR reward_description IS NULL OR reward_description = '';

-- إنشاء جدول لتتبع توزيع الجوائز
CREATE TABLE IF NOT EXISTS public.challenge_reward_distributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reward_id uuid REFERENCES public.challenge_rewards(id) ON DELETE CASCADE,
  user_position integer NOT NULL,
  followers_added integer DEFAULT 0,
  book_reads_added integer DEFAULT 0,
  selected_book_id uuid,
  distributed_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- إنشاء سياسات الأمان للجدول الجديد
ALTER TABLE public.challenge_reward_distributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reward distributions" ON public.challenge_reward_distributions
FOR SELECT USING (true);

CREATE POLICY "System can create reward distributions" ON public.challenge_reward_distributions
FOR INSERT WITH CHECK (true);