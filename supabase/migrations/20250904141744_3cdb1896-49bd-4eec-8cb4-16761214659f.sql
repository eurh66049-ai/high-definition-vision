-- حذف تحديات القراءة الشهرية المكررة
DELETE FROM public.challenge_participants 
WHERE challenge_id IN (
  SELECT id FROM public.challenges 
  WHERE title = 'تحدي القراءة الشهري'
);

-- حذف أنشطة التحديات المرتبطة
DELETE FROM public.challenge_activities 
WHERE challenge_id IN (
  SELECT id FROM public.challenges 
  WHERE title = 'تحدي القراءة الشهري'
);

-- حذف جوائز التحديات المرتبطة
DELETE FROM public.challenge_rewards 
WHERE challenge_id IN (
  SELECT id FROM public.challenges 
  WHERE title = 'تحدي القراءة الشهري'
);

-- حذف التحديات نفسها
DELETE FROM public.challenges 
WHERE title = 'تحدي القراءة الشهري';