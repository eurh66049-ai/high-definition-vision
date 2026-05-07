-- إصلاح أسماء المستخدمين المكررة بإضافة رقم فريد
DO $$
DECLARE
  dup_record RECORD;
  counter INT;
BEGIN
  -- البحث عن الأسماء المكررة وتحديثها
  FOR dup_record IN 
    SELECT id, username, 
           ROW_NUMBER() OVER (PARTITION BY lower(trim(username)) ORDER BY created_at) as rn
    FROM public.profiles
    WHERE lower(trim(username)) IN (
      SELECT lower(trim(username))
      FROM public.profiles
      GROUP BY lower(trim(username))
      HAVING COUNT(*) > 1
    )
  LOOP
    IF dup_record.rn > 1 THEN
      UPDATE public.profiles 
      SET username = dup_record.username || '_' || dup_record.rn
      WHERE id = dup_record.id;
    END IF;
  END LOOP;
END $$;

-- إضافة قيد الفريدة على username (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_unique 
ON public.profiles (lower(trim(username)));