-- إضافة نظام النقاط للتحديات عند الموافقة على الكتب
CREATE OR REPLACE FUNCTION public.add_challenge_points_on_book_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_writing_challenge_id uuid;
  v_challenge_rules jsonb;
  v_user_participation RECORD;
  v_bonus_points integer := 0;
  v_quality_bonus integer := 0;
BEGIN
  -- التحقق من أن الحالة تغيرت إلى approved
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    
    -- البحث عن تحدي الكتابة النشط
    SELECT id, rules INTO v_writing_challenge_id, v_challenge_rules
    FROM public.challenges 
    WHERE challenge_type = 'writing' 
      AND status = 'active'
      AND title LIKE '%المؤلفين الجدد%'
      AND start_date <= NOW()
      AND end_date >= NOW()
    LIMIT 1;
    
    -- إذا وُجد التحدي وكان المستخدم منضم إليه
    IF v_writing_challenge_id IS NOT NULL THEN
      
      SELECT * INTO v_user_participation
      FROM public.challenge_participants
      WHERE challenge_id = v_writing_challenge_id
        AND user_id = NEW.user_id
        AND is_active = true;
      
      -- إذا كان المستخدم منضم للتحدي
      IF FOUND THEN
        
        -- حساب النقاط الإضافية
        v_bonus_points := COALESCE((v_challenge_rules->>'bonus_for_approval')::integer, 25);
        
        -- نقاط إضافية للجودة (إذا كان التقييم عالي أو حجم الكتاب جيد)
        IF NEW.rating >= 4.0 OR NEW.page_count >= 100 THEN
          v_quality_bonus := COALESCE((v_challenge_rules->>'quality_bonus')::integer, 30);
        END IF;
        
        -- إضافة نقاط الموافقة
        IF v_bonus_points > 0 THEN
          INSERT INTO public.challenge_activities (
            challenge_id,
            user_id,
            activity_type,
            points,
            activity_data,
            created_at
          ) VALUES (
            v_writing_challenge_id,
            NEW.user_id,
            'book_approval',
            v_bonus_points,
            jsonb_build_object(
              'book_id', NEW.id,
              'book_title', NEW.title,
              'book_author', NEW.author,
              'approved_at', NOW(),
              'bonus_type', 'approval'
            ),
            NOW()
          );
          
          -- تحديث النقاط في جدول المشاركين
          UPDATE public.challenge_participants
          SET current_score = current_score + v_bonus_points
          WHERE id = v_user_participation.id;
          
        END IF;
        
        -- إضافة نقاط الجودة إذا كانت متاحة
        IF v_quality_bonus > 0 THEN
          INSERT INTO public.challenge_activities (
            challenge_id,
            user_id,
            activity_type,
            points,
            activity_data,
            created_at
          ) VALUES (
            v_writing_challenge_id,
            NEW.user_id,
            'quality_bonus',
            v_quality_bonus,
            jsonb_build_object(
              'book_id', NEW.id,
              'book_title', NEW.title,
              'book_author', NEW.author,
              'rating', NEW.rating,
              'page_count', NEW.page_count,
              'bonus_type', 'quality',
              'awarded_at', NOW()
            ),
            NOW()
          );
          
          -- تحديث النقاط في جدول المشاركين
          UPDATE public.challenge_participants
          SET current_score = current_score + v_quality_bonus
          WHERE id = v_user_participation.id;
          
        END IF;
        
        -- إنشاء إشعار للمستخدم عن النقاط الإضافية
        INSERT INTO public.notifications (
          user_id,
          title,
          message,
          type,
          book_submission_id,
          book_title,
          book_author,
          created_at
        ) VALUES (
          NEW.user_id,
          '🎉 نقاط إضافية من تحدي الكتابة!',
          'مبروك! تم اعتماد كتابك "' || NEW.title || '" وحصلت على ' || 
          (v_bonus_points + v_quality_bonus) || ' نقطة إضافية في تحدي الكتابة! ' ||
          CASE 
            WHEN v_quality_bonus > 0 THEN 'تم منحك نقاط الجودة العالية.'
            ELSE ''
          END,
          'success',
          NEW.id,
          NEW.title,
          NEW.author,
          NOW()
        );
        
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- إنشاء trigger لاستدعاء الدالة عند تحديث book_submissions
DROP TRIGGER IF EXISTS trigger_add_challenge_points_on_approval ON public.book_submissions;

CREATE TRIGGER trigger_add_challenge_points_on_approval
  AFTER UPDATE ON public.book_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.add_challenge_points_on_book_approval();