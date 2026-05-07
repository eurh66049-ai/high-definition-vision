-- إضافة trigger لإرسال إشعار للمؤلف عند تقييم كتابه
CREATE OR REPLACE FUNCTION public.notify_author_on_book_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_book_record RECORD;
  v_reviewer_profile RECORD;
BEGIN
  -- جلب معلومات الكتاب
  SELECT title, author, user_id 
  INTO v_book_record
  FROM public.book_submissions 
  WHERE id = NEW.book_id AND status = 'approved';
  
  -- جلب معلومات المراجع
  SELECT username, email
  INTO v_reviewer_profile
  FROM public.profiles
  WHERE id = NEW.user_id;
  
  -- إرسال إشعار للمؤلف إذا وُجد الكتاب
  IF v_book_record.user_id IS NOT NULL THEN
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
      v_book_record.user_id,
      'تقييم جديد لكتابك! ⭐',
      'قام ' || COALESCE(v_reviewer_profile.username, v_reviewer_profile.email, 'مستخدم مجهول') || 
      ' بتقييم كتاب "' || v_book_record.title || '" بـ ' || NEW.rating || ' نجوم. ' ||
      CASE WHEN NEW.comment IS NOT NULL AND NEW.comment != '' 
           THEN 'التعليق: "' || NEW.comment || '"'
           ELSE ''
      END,
      'info',
      NEW.book_id,
      v_book_record.title,
      v_book_record.author,
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- إنشاء trigger للتقييمات الجديدة
DROP TRIGGER IF EXISTS notify_author_on_review ON public.book_reviews;
CREATE TRIGGER notify_author_on_review
  AFTER INSERT ON public.book_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_author_on_book_review();

-- إضافة trigger لإشعار تحديث صورة الحساب
CREATE OR REPLACE FUNCTION public.notify_profile_avatar_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- إرسال إشعار فقط إذا تم تغيير avatar_url
  IF OLD.avatar_url IS DISTINCT FROM NEW.avatar_url THEN
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      created_at
    ) VALUES (
      NEW.id,
      'تم تحديث صورة الحساب ✅',
      'تم تحديث صورة حسابك بنجاح.',
      'success',
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- إنشاء trigger لتحديث الصورة الشخصية
DROP TRIGGER IF EXISTS notify_avatar_update ON public.profiles;
CREATE TRIGGER notify_avatar_update
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (OLD.avatar_url IS DISTINCT FROM NEW.avatar_url)
  EXECUTE FUNCTION public.notify_profile_avatar_update();