-- إنشاء جدول لحفظ المتصدرين الأسبوعيين السابقين
CREATE TABLE IF NOT EXISTS public.weekly_challenge_winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  username TEXT NOT NULL,
  avatar_url TEXT,
  final_score INTEGER NOT NULL DEFAULT 0,
  final_rank INTEGER NOT NULL,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  achievements JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء فهرس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_weekly_winners_challenge_week 
ON public.weekly_challenge_winners(challenge_id, week_start_date, week_end_date);

CREATE INDEX IF NOT EXISTS idx_weekly_winners_user 
ON public.weekly_challenge_winners(user_id);

-- تفعيل RLS
ALTER TABLE public.weekly_challenge_winners ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسات RLS
CREATE POLICY "Anyone can view weekly winners" 
ON public.weekly_challenge_winners FOR SELECT 
USING (true);

CREATE POLICY "System can insert weekly winners" 
ON public.weekly_challenge_winners FOR INSERT 
WITH CHECK (true);

-- دالة لحفظ المتصدرين الأسبوعيين وإعادة تعيين النقاط
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
  winner_record RECORD;
  current_week_start DATE;
  current_week_end DATE;
  saved_count INTEGER;
  reset_count INTEGER;
BEGIN
  -- تحديد بداية ونهاية الأسبوع الحالي (الأحد إلى السبت)
  current_week_start := date_trunc('week', CURRENT_DATE) + INTERVAL '1 day'; -- الأحد
  current_week_end := current_week_start + INTERVAL '6 days'; -- السبت

  -- معالجة كل تحدي نشط
  FOR challenge_record IN 
    SELECT c.id, c.title, c.challenge_type
    FROM public.challenges c 
    WHERE c.status = 'active'
  LOOP
    saved_count := 0;
    reset_count := 0;

    -- حفظ أفضل 10 مشاركين كمتصدرين للأسبوع
    FOR winner_record IN
      SELECT 
        cp.user_id,
        COALESCE(p.username, p.email, 'مستخدم مجهول') as username,
        p.avatar_url,
        cp.current_score,
        ROW_NUMBER() OVER (ORDER BY cp.current_score DESC) as rank,
        cp.achievements
      FROM public.challenge_participants cp
      LEFT JOIN public.profiles p ON cp.user_id = p.id
      WHERE cp.challenge_id = challenge_record.id 
        AND cp.is_active = true 
        AND cp.current_score > 0
      ORDER BY cp.current_score DESC
      LIMIT 10
    LOOP
      -- إدراج المتصدر في جدول الفائزين الأسبوعيين
      INSERT INTO public.weekly_challenge_winners (
        challenge_id,
        user_id,
        username,
        avatar_url,
        final_score,
        final_rank,
        week_start_date,
        week_end_date,
        achievements
      ) VALUES (
        challenge_record.id,
        winner_record.user_id,
        winner_record.username,
        winner_record.avatar_url,
        winner_record.current_score,
        winner_record.rank,
        current_week_start,
        current_week_end,
        winner_record.achievements
      );
      
      saved_count := saved_count + 1;
    END LOOP;

    -- إعادة تعيين نقاط جميع المشاركين إلى 0
    UPDATE public.challenge_participants 
    SET 
      current_score = 0,
      achievements = '[]'::jsonb
    WHERE challenge_id = challenge_record.id 
      AND is_active = true;

    GET DIAGNOSTICS reset_count = ROW_COUNT;

    -- حذف الأنشطة القديمة للحفاظ على الأداء
    DELETE FROM public.challenge_activities 
    WHERE challenge_id = challenge_record.id 
      AND created_at < current_week_start;

    -- إعادة النتائج
    RETURN QUERY SELECT 
      challenge_record.id,
      saved_count,
      reset_count;
  END LOOP;

  RETURN;
END;
$$;

-- دالة للحصول على المتصدرين الأسبوعيين السابقين
CREATE OR REPLACE FUNCTION public.get_previous_weekly_winners(
  p_challenge_id UUID,
  p_weeks_back INTEGER DEFAULT 1
)
RETURNS TABLE(
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  final_score INTEGER,
  final_rank INTEGER,
  week_start_date DATE,
  week_end_date DATE,
  achievements JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_week_start DATE;
BEGIN
  -- حساب الأسبوع المستهدف
  target_week_start := date_trunc('week', CURRENT_DATE) + INTERVAL '1 day' - INTERVAL '7 days' * p_weeks_back;

  RETURN QUERY
  SELECT 
    wcw.user_id,
    wcw.username,
    wcw.avatar_url,
    wcw.final_score,
    wcw.final_rank,
    wcw.week_start_date,
    wcw.week_end_date,
    wcw.achievements
  FROM public.weekly_challenge_winners wcw
  WHERE wcw.challenge_id = p_challenge_id
    AND wcw.week_start_date = target_week_start
  ORDER BY wcw.final_rank ASC;
END;
$$;

-- دالة للحصول على قائمة الأسابيع المتاحة
CREATE OR REPLACE FUNCTION public.get_available_challenge_weeks(p_challenge_id UUID)
RETURNS TABLE(
  week_start_date DATE,
  week_end_date DATE,
  winners_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wcw.week_start_date,
    wcw.week_end_date,
    COUNT(*)::INTEGER as winners_count
  FROM public.weekly_challenge_winners wcw
  WHERE wcw.challenge_id = p_challenge_id
  GROUP BY wcw.week_start_date, wcw.week_end_date
  ORDER BY wcw.week_start_date DESC;
END;
$$;