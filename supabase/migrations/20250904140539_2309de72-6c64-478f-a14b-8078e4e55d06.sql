-- تحديث وصف الجوائز لتحدي القراءة الشهري النشط لإزالة النص عن الجوائز النقدية
UPDATE public.challenges 
SET prize_description = 'شهادات تقدير وجوائز قيمة للفائزين الثلاثة الأوائل'
WHERE id = 'e1b931c9-4bc1-4cbf-b9e5-2cc13771004a';