-- إنشاء trigger لتحديث عدد المشاركين في التحديات
CREATE OR REPLACE TRIGGER update_challenge_participants_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.challenge_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_challenge_participants_count();

-- تحديث عدد المشاركين الحالي في جدول التحديات ليكون متطابقاً مع الواقع
UPDATE public.challenges
SET current_participants = (
  SELECT COUNT(*)
  FROM public.challenge_participants cp
  WHERE cp.challenge_id = challenges.id
    AND cp.is_active = true
);