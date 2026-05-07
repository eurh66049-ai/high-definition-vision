-- تقليل أعداد المشاركين القصوى في التحديات لتناسب موقعاً جديداً
UPDATE public.challenges 
SET max_participants = CASE 
  WHEN max_participants >= 1000 THEN 50
  WHEN max_participants >= 500 THEN 30
  WHEN max_participants >= 300 THEN 25
  WHEN max_participants >= 200 THEN 20
  WHEN max_participants >= 100 THEN 15
  ELSE max_participants
END,
current_participants = CASE 
  WHEN current_participants > 5 THEN LEAST(current_participants, 3)
  ELSE current_participants
END;