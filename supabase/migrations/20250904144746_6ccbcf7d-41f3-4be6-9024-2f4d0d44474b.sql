-- إضافة unique constraint للحقل challenge_id و position في جدول challenge_rewards
ALTER TABLE challenge_rewards 
ADD CONSTRAINT unique_challenge_position 
UNIQUE (challenge_id, position);

-- إنشاء جوائز افتراضية للتحديات الموجودة  
WITH existing_challenges AS (
  SELECT id FROM challenges WHERE status IN ('active', 'upcoming')
),
challenge_rewards_data AS (
  SELECT 
    c.id as challenge_id,
    positions.position,
    CASE 
      WHEN positions.position = 1 THEN 'المركز الأول 🥇'
      WHEN positions.position = 2 THEN 'المركز الثاني 🥈'
      WHEN positions.position = 3 THEN 'المركز الثالث 🥉'
    END as reward_title,
    CASE 
      WHEN positions.position = 1 THEN 'الفائز الأول يحصل على أكبر عدد من المتابعين والقراءات'
      WHEN positions.position = 2 THEN 'الفائز الثاني يحصل على عدد ممتاز من المتابعين والقراءات'
      WHEN positions.position = 3 THEN 'الفائز الثالث يحصل على دفعة قوية لحسابه'
    END as reward_description,
    CASE 
      WHEN positions.position = 1 THEN 500
      WHEN positions.position = 2 THEN 300
      WHEN positions.position = 3 THEN 100
    END as followers_count,
    CASE 
      WHEN positions.position = 1 THEN 1000
      WHEN positions.position = 2 THEN 700
      WHEN positions.position = 3 THEN 500
    END as book_reads_count,
    'social_boost' as reward_type,
    CASE 
      WHEN positions.position = 1 THEN 'premium'
      WHEN positions.position = 2 THEN 'high'
      WHEN positions.position = 3 THEN 'medium'
    END as reward_value
  FROM existing_challenges c
  CROSS JOIN (
    SELECT 1 as position 
    UNION SELECT 2 
    UNION SELECT 3
  ) positions
)
INSERT INTO challenge_rewards (
  challenge_id,
  position,
  reward_title,
  reward_description,
  followers_count,
  book_reads_count,
  reward_type,
  reward_value
)
SELECT 
  challenge_id,
  position,
  reward_title,
  reward_description,
  followers_count,
  book_reads_count,
  reward_type,
  reward_value
FROM challenge_rewards_data
ON CONFLICT (challenge_id, position) DO UPDATE SET
  reward_title = EXCLUDED.reward_title,
  reward_description = EXCLUDED.reward_description,
  followers_count = EXCLUDED.followers_count,
  book_reads_count = EXCLUDED.book_reads_count,
  reward_type = EXCLUDED.reward_type,
  reward_value = EXCLUDED.reward_value;