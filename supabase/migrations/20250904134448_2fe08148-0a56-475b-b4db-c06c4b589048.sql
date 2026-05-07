-- إنشاء trigger لتحديث نقاط التحدي تلقائياً عند إضافة مراجعة كتاب
CREATE OR REPLACE FUNCTION public.update_challenge_score_on_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_challenge_id uuid;
  v_points integer := 10; -- نقاط المراجعة الواحدة
BEGIN
  -- البحث عن تحدي المراجعات النشط
  SELECT id INTO v_challenge_id
  FROM public.challenges 
  WHERE challenge_type = 'reviews' 
  AND status = 'active' 
  AND start_date <= NOW() 
  AND end_date >= NOW()
  LIMIT 1;
  
  -- إذا وُجد تحدي نشط للمراجعات
  IF v_challenge_id IS NOT NULL THEN
    -- التحقق من اشتراك المستخدم في التحدي
    IF EXISTS (
      SELECT 1 FROM public.challenge_participants 
      WHERE challenge_id = v_challenge_id 
      AND user_id = NEW.user_id 
      AND is_active = true
    ) THEN
      -- تحديث النقاط
      UPDATE public.challenge_participants 
      SET current_score = current_score + v_points
      WHERE challenge_id = v_challenge_id 
      AND user_id = NEW.user_id;
      
      -- تسجيل النشاط
      INSERT INTO public.challenge_activities (
        challenge_id,
        user_id,
        activity_type,
        points,
        activity_data
      ) VALUES (
        v_challenge_id,
        NEW.user_id,
        'book_review',
        v_points,
        jsonb_build_object(
          'book_id', NEW.book_id,
          'review_id', NEW.id,
          'rating', NEW.rating,
          'review_comment', COALESCE(NEW.comment, '')
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- إنشاء trigger يتم تشغيله عند إضافة مراجعة جديدة
DROP TRIGGER IF EXISTS trigger_update_challenge_score_on_review ON public.book_reviews;
CREATE TRIGGER trigger_update_challenge_score_on_review
  AFTER INSERT ON public.book_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_challenge_score_on_review();

-- إنشاء function لإضافة نقاط للمراجعات الموجودة (للمستخدمين المشتركين في التحدي)
CREATE OR REPLACE FUNCTION public.add_points_for_existing_reviews()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_challenge_id uuid;
  v_points integer := 10;
  v_review_record RECORD;
  v_points_added integer := 0;
BEGIN
  -- البحث عن تحدي المراجعات النشط
  SELECT id INTO v_challenge_id
  FROM public.challenges 
  WHERE challenge_type = 'reviews' 
  AND status = 'active' 
  AND start_date <= NOW() 
  AND end_date >= NOW()
  LIMIT 1;
  
  IF v_challenge_id IS NULL THEN
    RAISE NOTICE 'لا يوجد تحدي مراجعات نشط';
    RETURN 0;
  END IF;
  
  -- إضافة نقاط للمراجعات الموجودة للمستخدمين المشتركين في التحدي
  FOR v_review_record IN
    SELECT br.id, br.user_id, br.book_id, br.rating, br.comment, br.created_at
    FROM public.book_reviews br
    INNER JOIN public.challenge_participants cp ON br.user_id = cp.user_id
    WHERE cp.challenge_id = v_challenge_id 
    AND cp.is_active = true
    AND br.created_at >= (SELECT start_date FROM public.challenges WHERE id = v_challenge_id)
    AND NOT EXISTS (
      SELECT 1 FROM public.challenge_activities 
      WHERE challenge_id = v_challenge_id 
      AND user_id = br.user_id 
      AND activity_type = 'book_review'
      AND activity_data->>'review_id' = br.id::text
    )
  LOOP
    -- تحديث النقاط
    UPDATE public.challenge_participants 
    SET current_score = current_score + v_points
    WHERE challenge_id = v_challenge_id 
    AND user_id = v_review_record.user_id;
    
    -- تسجيل النشاط
    INSERT INTO public.challenge_activities (
      challenge_id,
      user_id,
      activity_type,
      points,
      activity_data,
      created_at
    ) VALUES (
      v_challenge_id,
      v_review_record.user_id,
      'book_review',
      v_points,
      jsonb_build_object(
        'book_id', v_review_record.book_id,
        'review_id', v_review_record.id,
        'rating', v_review_record.rating,
        'review_comment', COALESCE(v_review_record.comment, ''),
        'retroactive', true
      ),
      v_review_record.created_at
    );
    
    v_points_added := v_points_added + v_points;
  END LOOP;
  
  RETURN v_points_added;
END;
$$;