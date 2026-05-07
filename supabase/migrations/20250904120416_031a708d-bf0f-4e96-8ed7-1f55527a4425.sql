-- إنشاء أنواع التحديات
CREATE TYPE public.challenge_type AS ENUM ('reading', 'writing', 'quotes', 'reviews', 'followers');
CREATE TYPE public.challenge_status AS ENUM ('upcoming', 'active', 'completed', 'cancelled');

-- جدول التحديات
CREATE TABLE public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  challenge_type challenge_type NOT NULL,
  status challenge_status NOT NULL DEFAULT 'upcoming',
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  prize_description TEXT,
  max_participants INTEGER DEFAULT 100,
  current_participants INTEGER DEFAULT 0,
  rules JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- جدول اشتراك المستخدمين في التحديات
CREATE TABLE public.challenge_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  current_score INTEGER DEFAULT 0,
  achievements JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  UNIQUE(challenge_id, user_id)
);

-- جدول أنشطة التحدي (لتتبع الإنجازات)
CREATE TABLE public.challenge_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'book_read', 'book_uploaded', 'quote_added', 'review_written', 'follower_gained'
  points INTEGER DEFAULT 0,
  activity_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- جدول جوائز التحديات
CREATE TABLE public.challenge_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES public.challenges(id) ON DELETE CASCADE,
  position INTEGER NOT NULL, -- 1st, 2nd, 3rd place
  reward_title TEXT NOT NULL,
  reward_description TEXT,
  reward_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX idx_challenges_status_dates ON public.challenges(status, start_date, end_date);
CREATE INDEX idx_challenge_participants_challenge_user ON public.challenge_participants(challenge_id, user_id);
CREATE INDEX idx_challenge_activities_challenge_user_date ON public.challenge_activities(challenge_id, user_id, created_at);

-- تفعيل Row Level Security
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_rewards ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان للتحديات - يمكن للجميع رؤيتها
CREATE POLICY "Anyone can view challenges" ON public.challenges FOR SELECT USING (true);
CREATE POLICY "Admins can manage challenges" ON public.challenges FOR ALL USING (
  EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND is_active = true)
);

-- سياسات المشاركين
CREATE POLICY "Anyone can view challenge participants" ON public.challenge_participants FOR SELECT USING (true);
CREATE POLICY "Users can join challenges" ON public.challenge_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their participation" ON public.challenge_participants FOR UPDATE USING (auth.uid() = user_id);

-- سياسات الأنشطة
CREATE POLICY "Anyone can view challenge activities" ON public.challenge_activities FOR SELECT USING (true);
CREATE POLICY "System can create activities" ON public.challenge_activities FOR INSERT WITH CHECK (true);

-- سياسات الجوائز
CREATE POLICY "Anyone can view challenge rewards" ON public.challenge_rewards FOR SELECT USING (true);
CREATE POLICY "Admins can manage rewards" ON public.challenge_rewards FOR ALL USING (
  EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND is_active = true)
);

-- دالة لتحديث نقاط المشاركين
CREATE OR REPLACE FUNCTION public.update_challenge_score(
  p_challenge_id UUID,
  p_user_id UUID,
  p_activity_type TEXT,
  p_points INTEGER,
  p_activity_data JSONB DEFAULT '{}'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- إضافة النشاط
  INSERT INTO public.challenge_activities (
    challenge_id, user_id, activity_type, points, activity_data
  ) VALUES (
    p_challenge_id, p_user_id, p_activity_type, p_points, p_activity_data
  );
  
  -- تحديث النقاط
  UPDATE public.challenge_participants 
  SET 
    current_score = current_score + p_points,
    updated_at = now()
  WHERE challenge_id = p_challenge_id AND user_id = p_user_id;
  
  RETURN TRUE;
END;
$$;

-- دالة للحصول على ترتيب المشاركين
CREATE OR REPLACE FUNCTION public.get_challenge_leaderboard(p_challenge_id UUID)
RETURNS TABLE(
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  current_score INTEGER,
  rank INTEGER
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
    ROW_NUMBER() OVER (ORDER BY cp.current_score DESC)::INTEGER as rank
  FROM public.challenge_participants cp
  LEFT JOIN public.profiles p ON cp.user_id = p.id
  WHERE cp.challenge_id = p_challenge_id AND cp.is_active = true
  ORDER BY cp.current_score DESC;
END;
$$;

-- إدراج تحديات مثال
INSERT INTO public.challenges (title, description, challenge_type, status, start_date, end_date, prize_description, rules) VALUES
(
  'تحدي القراءة الشهري',
  'اقرأ أكبر عدد من الكتب خلال شهر واحد وكن أول القراء!',
  'reading',
  'active',
  NOW(),
  NOW() + INTERVAL '30 days',
  'شهادة تقدير + مجموعة كتب مميزة',
  '{"points_per_book": 10, "bonus_for_review": 5, "minimum_books": 3}'
),
(
  'تحدي المؤلفين الجدد',
  'ارفع كتابك الأول أو كتاب جديد وشارك في المسابقة',
  'writing',
  'active', 
  NOW(),
  NOW() + INTERVAL '45 days',
  'نشر مميز + تسويق مجاني للكتاب',
  '{"points_per_upload": 50, "bonus_for_approval": 25, "quality_bonus": 30}'
),
(
  'تحدي الاقتباسات الملهمة',
  'اكتب أجمل الاقتباسات من كتبك المفضلة واحصل على إعجاب القراء',
  'quotes',
  'upcoming',
  NOW() + INTERVAL '7 days',
  NOW() + INTERVAL '37 days',
  'مشاركة مميزة في الصفحة الرئيسية',
  '{"points_per_quote": 5, "points_per_like": 2, "viral_bonus": 20}'
);

-- إدراج الجوائز
INSERT INTO public.challenge_rewards (challenge_id, position, reward_title, reward_description) VALUES
((SELECT id FROM public.challenges WHERE title = 'تحدي القراءة الشهري'), 1, 'المركز الأول', 'شهادة تقدير + 10 كتب مميزة + عضوية VIP'),
((SELECT id FROM public.challenges WHERE title = 'تحدي القراءة الشهري'), 2, 'المركز الثاني', 'شهادة تقدير + 5 كتب مميزة'),
((SELECT id FROM public.challenges WHERE title = 'تحدي القراءة الشهري'), 3, 'المركز الثالث', 'شهادة تقدير + 3 كتب مميزة');