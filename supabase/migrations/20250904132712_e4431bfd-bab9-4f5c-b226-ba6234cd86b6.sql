-- حذف الدالة الموجودة وإعادة إنشائها
DROP FUNCTION IF EXISTS public.get_challenge_leaderboard(uuid);

-- إنشاء الدالة بشكل صحيح
CREATE OR REPLACE FUNCTION public.get_challenge_leaderboard(p_challenge_id uuid)
RETURNS TABLE(
  user_id uuid,
  username text,
  avatar_url text,
  current_score integer,
  rank bigint,
  joined_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    cp.user_id,
    COALESCE(p.username, p.email, 'مستخدم مجهول') as username,
    p.avatar_url,
    cp.current_score,
    ROW_NUMBER() OVER (ORDER BY cp.current_score DESC, cp.joined_at ASC) as rank,
    cp.joined_at
  FROM public.challenge_participants cp
  LEFT JOIN public.profiles p ON cp.user_id = p.id
  WHERE cp.challenge_id = p_challenge_id 
    AND cp.is_active = true
  ORDER BY cp.current_score DESC, cp.joined_at ASC;
END;
$function$;

-- إنشاء triggers لتحديث النقاط تلقائياً
-- trigger عند زيادة مشاهدات الكتاب (يُحسب كقراءة)
DROP TRIGGER IF EXISTS trigger_award_reading_points ON public.book_submissions;
CREATE TRIGGER trigger_award_reading_points
  AFTER UPDATE OF views ON public.book_submissions
  FOR EACH ROW
  WHEN (NEW.views > OLD.views AND NEW.status = 'approved')
  EXECUTE FUNCTION public.award_reading_points();

-- trigger عند كتابة مراجعة جديدة
DROP TRIGGER IF EXISTS trigger_award_review_points ON public.book_reviews;
CREATE TRIGGER trigger_award_review_points
  AFTER INSERT ON public.book_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.award_review_points();

-- trigger عند رفع كتاب جديد أو الموافقة عليه
DROP TRIGGER IF EXISTS trigger_award_writing_points ON public.book_submissions;
CREATE TRIGGER trigger_award_writing_points
  AFTER INSERT OR UPDATE OF status ON public.book_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.award_writing_points();