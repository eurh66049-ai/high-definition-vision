-- إنشاء وظيفة تحديث نقاط التحدي
CREATE OR REPLACE FUNCTION public.update_challenge_score(
  p_challenge_id uuid,
  p_user_id uuid,
  p_activity_type text,
  p_points integer,
  p_activity_data jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- التحقق من أن المستخدم مشترك في التحدي
  IF NOT EXISTS (
    SELECT 1 FROM public.challenge_participants 
    WHERE challenge_id = p_challenge_id 
    AND user_id = p_user_id 
    AND is_active = true
  ) THEN
    RETURN;
  END IF;

  -- إضافة النشاط
  INSERT INTO public.challenge_activities (
    challenge_id,
    user_id,
    activity_type,
    points,
    activity_data
  ) VALUES (
    p_challenge_id,
    p_user_id,
    p_activity_type,
    p_points,
    p_activity_data
  );

  -- تحديث النقاط الإجمالية للمشارك
  UPDATE public.challenge_participants
  SET 
    current_score = current_score + p_points,
    achievements = CASE 
      WHEN (current_score + p_points) >= 100 THEN 
        achievements || '["المستوى الأول"]'::jsonb
      ELSE achievements 
    END
  WHERE challenge_id = p_challenge_id AND user_id = p_user_id;
END;
$function$;

-- إنشاء وظيفة للحصول على لوحة المتصدرين
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

-- وظيفة لتحديث النقاط عند قراءة كتاب
CREATE OR REPLACE FUNCTION public.award_reading_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  reading_challenge_id uuid;
  points_per_book integer;
BEGIN
  -- البحث عن تحديات القراءة النشطة
  FOR reading_challenge_id, points_per_book IN 
    SELECT id, COALESCE((rules->>'points_per_book')::integer, 10)
    FROM public.challenges 
    WHERE challenge_type = 'reading' 
      AND status = 'active'
      AND start_date <= NOW() 
      AND end_date >= NOW()
  LOOP
    -- منح النقاط إذا كان المستخدم مشتركاً في التحدي
    PERFORM public.update_challenge_score(
      reading_challenge_id,
      NEW.user_id,
      'book_view',
      points_per_book,
      jsonb_build_object('book_id', NEW.id, 'book_title', NEW.title)
    );
  END LOOP;

  RETURN NEW;
END;
$function$;

-- وظيفة لتحديث النقاط عند كتابة مراجعة
CREATE OR REPLACE FUNCTION public.award_review_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  review_challenge_id uuid;
  points_per_review integer;
BEGIN
  -- البحث عن تحديات المراجعات النشطة
  FOR review_challenge_id, points_per_review IN 
    SELECT id, COALESCE((rules->>'points_per_review')::integer, 10)
    FROM public.challenges 
    WHERE challenge_type = 'reviews' 
      AND status = 'active'
      AND start_date <= NOW() 
      AND end_date >= NOW()
  LOOP
    -- منح النقاط إذا كان المستخدم مشتركاً في التحدي
    PERFORM public.update_challenge_score(
      review_challenge_id,
      NEW.user_id,
      'book_review',
      points_per_review,
      jsonb_build_object('book_id', NEW.book_id, 'rating', NEW.rating)
    );
  END LOOP;

  RETURN NEW;
END;
$function$;

-- وظيفة لتحديث النقاط عند رفع كتاب
CREATE OR REPLACE FUNCTION public.award_writing_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  writing_challenge_id uuid;
  points_per_upload integer;
  bonus_for_approval integer;
BEGIN
  -- البحث عن تحديات الكتابة النشطة
  FOR writing_challenge_id, points_per_upload, bonus_for_approval IN 
    SELECT 
      id, 
      COALESCE((rules->>'points_per_upload')::integer, 50),
      COALESCE((rules->>'bonus_for_approval')::integer, 25)
    FROM public.challenges 
    WHERE challenge_type = 'writing' 
      AND status = 'active'
      AND start_date <= NOW() 
      AND end_date >= NOW()
  LOOP
    -- منح نقاط الرفع عند الرفع الأولي
    IF TG_OP = 'INSERT' AND NEW.user_id IS NOT NULL THEN
      PERFORM public.update_challenge_score(
        writing_challenge_id,
        NEW.user_id,
        'book_upload',
        points_per_upload,
        jsonb_build_object('book_id', NEW.id, 'book_title', NEW.title)
      );
    END IF;
    
    -- منح نقاط إضافية عند الموافقة
    IF TG_OP = 'UPDATE' AND OLD.status != 'approved' AND NEW.status = 'approved' AND NEW.user_id IS NOT NULL THEN
      PERFORM public.update_challenge_score(
        writing_challenge_id,
        NEW.user_id,
        'book_approval',
        bonus_for_approval,
        jsonb_build_object('book_id', NEW.id, 'book_title', NEW.title)
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$;

-- إنشاء triggers لتحديث النقاط تلقائياً

-- trigger عند زيادة مشاهدات الكتاب (يُحسب كقراءة)
CREATE TRIGGER trigger_award_reading_points
  AFTER UPDATE OF views ON public.book_submissions
  FOR EACH ROW
  WHEN (NEW.views > OLD.views AND NEW.status = 'approved')
  EXECUTE FUNCTION public.award_reading_points();

-- trigger عند كتابة مراجعة جديدة
CREATE TRIGGER trigger_award_review_points
  AFTER INSERT ON public.book_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.award_review_points();

-- trigger عند رفع كتاب جديد أو الموافقة عليه
CREATE TRIGGER trigger_award_writing_points
  AFTER INSERT OR UPDATE OF status ON public.book_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.award_writing_points();