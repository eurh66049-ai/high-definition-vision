-- إضافة الأعمدة الناقصة لجدول quotes إذا لم تكن موجودة
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT true;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS author_name text;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS book_title text;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS page_number integer;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- تمكين RLS على جدول الاقتباسات إذا لم يكن مُمكناً
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- حذف السياسات الموجودة وإعادة إنشائها
DROP POLICY IF EXISTS "Users can view public quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can create their own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can update their own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can delete their own quotes" ON public.quotes;

-- سياسات RLS للاقتباسات
CREATE POLICY "Users can view public quotes" ON public.quotes
  FOR SELECT USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can create their own quotes" ON public.quotes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quotes" ON public.quotes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own quotes" ON public.quotes
  FOR DELETE USING (auth.uid() = user_id);

-- دالة لتحديث النقاط في التحدي
CREATE OR REPLACE FUNCTION public.update_challenge_score(
  p_challenge_id uuid,
  p_user_id uuid,
  p_activity_type text,
  p_points integer,
  p_activity_data jsonb DEFAULT '{}'::jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_participant_exists boolean;
BEGIN
  -- التحقق من اشتراك المستخدم في التحدي
  SELECT EXISTS(
    SELECT 1 FROM public.challenge_participants 
    WHERE challenge_id = p_challenge_id 
    AND user_id = p_user_id 
    AND is_active = true
  ) INTO v_participant_exists;
  
  -- إذا لم يكن مشتركاً، لا نفعل شيء
  IF NOT v_participant_exists THEN
    RETURN FALSE;
  END IF;
  
  -- تحديث النقاط
  UPDATE public.challenge_participants 
  SET current_score = current_score + p_points
  WHERE challenge_id = p_challenge_id 
  AND user_id = p_user_id;
  
  -- تسجيل النشاط
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
  
  RETURN TRUE;
EXCEPTION
  WHEN others THEN
    RAISE LOG 'Error in update_challenge_score: %', SQLERRM;
    RETURN FALSE;
END;
$function$;

-- وظيفة لتحديث النقاط عند إضافة اقتباس
CREATE OR REPLACE FUNCTION public.award_quote_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  quote_challenge_id uuid;
  points_per_quote integer;
BEGIN
  -- البحث عن تحديات الاقتباسات النشطة
  FOR quote_challenge_id, points_per_quote IN 
    SELECT id, COALESCE((rules->>'points_per_quote')::integer, 5)
    FROM public.challenges 
    WHERE challenge_type = 'quotes' 
      AND status = 'active'
      AND start_date <= NOW() 
      AND end_date >= NOW()
  LOOP
    -- منح النقاط إذا كان المستخدم مشتركاً في التحدي
    PERFORM public.update_challenge_score(
      quote_challenge_id,
      NEW.user_id,
      'quote_add',
      points_per_quote,
      jsonb_build_object('quote_id', NEW.id, 'quote_text', NEW.text)
    );
  END LOOP;

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE LOG 'Error in award_quote_points: %', SQLERRM;
    RETURN NEW;
END;
$function$;

-- وظيفة لمنح نقاط المتابعة
CREATE OR REPLACE FUNCTION public.award_follower_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  follower_challenge_id uuid;
  points_per_follow integer;
BEGIN
  -- البحث عن تحديات المتابعة النشطة
  FOR follower_challenge_id, points_per_follow IN 
    SELECT id, COALESCE((rules->>'points_per_follow')::integer, 3)
    FROM public.challenges 
    WHERE challenge_type = 'followers' 
      AND status = 'active'
      AND start_date <= NOW() 
      AND end_date >= NOW()
  LOOP
    -- منح النقاط للمؤلف المُتابَع (إذا كان له user_id)
    IF EXISTS (SELECT 1 FROM public.authors WHERE id = NEW.author_id AND user_id IS NOT NULL) THEN
      PERFORM public.update_challenge_score(
        follower_challenge_id,
        (SELECT user_id FROM public.authors WHERE id = NEW.author_id),
        'follower_gained',
        points_per_follow,
        jsonb_build_object('follower_id', NEW.user_id, 'author_id', NEW.author_id)
      );
    END IF;
  END LOOP;

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE LOG 'Error in award_follower_points: %', SQLERRM;
    RETURN NEW;
END;
$function$;

-- إنشاء جميع التريغرز
-- trigger عند زيادة مشاهدات الكتاب (قراءة)
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

-- trigger عند إضافة اقتباس جديد
DROP TRIGGER IF EXISTS trigger_award_quote_points ON public.quotes;
CREATE TRIGGER trigger_award_quote_points
  AFTER INSERT ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.award_quote_points();

-- trigger عند متابعة مؤلف
DROP TRIGGER IF EXISTS trigger_award_follower_points ON public.author_followers;
CREATE TRIGGER trigger_award_follower_points
  AFTER INSERT ON public.author_followers
  FOR EACH ROW
  EXECUTE FUNCTION public.award_follower_points();

-- دالة لتحديث عداد المشاركين في التحدي
CREATE OR REPLACE FUNCTION public.update_challenge_participants_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.is_active = true THEN
    -- زيادة عدد المشاركين
    UPDATE public.challenges 
    SET current_participants = current_participants + 1
    WHERE id = NEW.challenge_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- تحديث العدد حسب التغيير
    IF OLD.is_active = true AND NEW.is_active = false THEN
      -- المستخدم خرج من التحدي
      UPDATE public.challenges 
      SET current_participants = GREATEST(current_participants - 1, 0)
      WHERE id = NEW.challenge_id;
    ELSIF OLD.is_active = false AND NEW.is_active = true THEN
      -- المستخدم عاد للتحدي
      UPDATE public.challenges 
      SET current_participants = current_participants + 1
      WHERE id = NEW.challenge_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.is_active = true THEN
    -- تقليل عدد المشاركين
    UPDATE public.challenges 
    SET current_participants = GREATEST(current_participants - 1, 0)
    WHERE id = OLD.challenge_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- trigger لتحديث عدد المشاركين
DROP TRIGGER IF EXISTS trigger_update_participants_count ON public.challenge_participants;
CREATE TRIGGER trigger_update_participants_count
  AFTER INSERT OR UPDATE OR DELETE ON public.challenge_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_challenge_participants_count();

-- فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_challenge_participants_user_challenge ON public.challenge_participants(user_id, challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_activities_challenge_user ON public.challenge_activities(challenge_id, user_id);
CREATE INDEX IF NOT EXISTS idx_challenges_type_status ON public.challenges(challenge_type, status);
CREATE INDEX IF NOT EXISTS idx_quotes_user_id ON public.quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_book_id ON public.quotes(book_id);