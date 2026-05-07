-- حذف جميع الـ triggers المكررة
DROP TRIGGER IF EXISTS trigger_update_participants_count ON public.challenge_participants;
DROP TRIGGER IF EXISTS challenge_participants_count_trigger ON public.challenge_participants;
DROP TRIGGER IF EXISTS update_challenge_participants_count_trigger ON public.challenge_participants;

-- إنشاء trigger واحد فقط
CREATE TRIGGER update_challenge_participants_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.challenge_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_challenge_participants_count();

-- تصحيح العدد الحالي في جدول التحديات
UPDATE public.challenges
SET current_participants = (
  SELECT COUNT(*)
  FROM public.challenge_participants cp
  WHERE cp.challenge_id = challenges.id
    AND cp.is_active = true
);