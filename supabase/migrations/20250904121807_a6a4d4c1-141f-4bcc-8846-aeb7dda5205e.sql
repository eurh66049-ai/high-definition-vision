-- إصلاح RLS policies لجدول admin_users
DROP POLICY IF EXISTS "Admins can manage admin table" ON admin_users;

-- إنشاء دالة للتحقق من الصلاحيات الإدارية بدون infinite recursion
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM admin_users
    WHERE email = (
      SELECT email 
      FROM auth.users 
      WHERE id = auth.uid()
    )
    AND is_active = true
  );
$$;

-- إنشاء RLS policy جديدة بدون infinite recursion
CREATE POLICY "Admins can manage admin table" ON admin_users
FOR ALL USING (
  auth.email() IN (
    SELECT email FROM admin_users WHERE is_active = true
  )
);

-- إنشاء بعض التحديات الأولية
INSERT INTO challenges (
  id,
  title,
  description,
  challenge_type,
  status,
  start_date,
  end_date,
  max_participants,
  rules,
  prize_description
) VALUES 
(
  gen_random_uuid(),
  'تحدي القراءة الشهري',
  'اقرأ 5 كتب خلال شهر واكسب نقاط وجوائز رائعة',
  'reading',
  'active',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP + INTERVAL '30 days',
  1000,
  '{"target": 5, "timeframe": "monthly", "points_per_book": 20}',
  'شهادة تقدير وجوائز نقدية للفائزين الثلاثة الأوائل'
),
(
  gen_random_uuid(),
  'تحدي كتابة المراجعات',
  'اكتب 20 مراجعة لكتب مختلفة واحصل على نقاط إضافية',
  'reviews',
  'active',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP + INTERVAL '30 days',
  500,
  '{"target": 20, "timeframe": "monthly", "points_per_review": 10}',
  'شارة الناقد المميز وهدايا قيمة'
),
(
  gen_random_uuid(),
  'تحدي جمع الاقتباسات',
  'اجمع 30 اقتباس ملهم من الكتب المختلفة',
  'quotes',
  'active',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP + INTERVAL '21 days',
  300,
  '{"target": 30, "timeframe": "3_weeks", "points_per_quote": 5}',
  'مجموعة كتب مختارة وشارة جامع الحكم'
),
(
  gen_random_uuid(),
  'تحدي الكتابة الإبداعية',
  'اكتب 10 مقالات أو قصص قصيرة مستوحاة من قراءاتك',
  'writing',
  'upcoming',
  CURRENT_TIMESTAMP + INTERVAL '3 days',
  CURRENT_TIMESTAMP + INTERVAL '33 days',
  200,
  '{"target": 10, "timeframe": "monthly", "points_per_article": 25}',
  'فرصة نشر أفضل الأعمال وجوائز مالية'
);

-- إضافة بعض الجوائز للتحديات
INSERT INTO challenge_rewards (
  challenge_id,
  position,
  reward_title,
  reward_description,
  reward_value
)
SELECT 
  c.id,
  p.position,
  p.title,
  p.description,
  p.value
FROM challenges c
CROSS JOIN (
  VALUES 
    (1, 'المركز الأول', 'جائزة نقدية وشهادة تقدير', '500 ريال + شهادة'),
    (2, 'المركز الثاني', 'جائزة نقدية وكتب', '300 ريال + مجموعة كتب'),
    (3, 'المركز الثالث', 'جائزة تشجيعية', '200 ريال + شارة تميز')
) AS p(position, title, description, value)
WHERE c.status = 'active';

-- إنشاء دالة لتحديث عدد المشاركين تلقائياً
CREATE OR REPLACE FUNCTION update_challenge_participants_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE challenges 
    SET current_participants = current_participants + 1 
    WHERE id = NEW.challenge_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE challenges 
    SET current_participants = GREATEST(0, current_participants - 1) 
    WHERE id = OLD.challenge_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger لتحديث عدد المشاركين
DROP TRIGGER IF EXISTS challenge_participants_count_trigger ON challenge_participants;
CREATE TRIGGER challenge_participants_count_trigger
  AFTER INSERT OR DELETE ON challenge_participants
  FOR EACH ROW EXECUTE FUNCTION update_challenge_participants_count();