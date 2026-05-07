-- نقل البيانات من author_bio في book_submissions إلى bio في profiles
-- للمؤلفين الذين كانوا قد أدخلوا نبذتهم سابقاً

-- إنشاء دالة لنقل تعريف المؤلف من book_submissions إلى profiles
CREATE OR REPLACE FUNCTION migrate_author_bio_to_profiles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  submission_record RECORD;
  author_record RECORD;
BEGIN
  -- جلب جميع الطلبات التي تحتوي على author_bio
  FOR submission_record IN 
    SELECT DISTINCT user_id, author_bio 
    FROM public.book_submissions 
    WHERE author_bio IS NOT NULL 
      AND author_bio != '' 
      AND user_id IS NOT NULL
  LOOP
    -- التحقق من وجود المستخدم في جدول profiles
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = submission_record.user_id) THEN
      -- تحديث bio في profiles إذا كان فارغاً
      UPDATE public.profiles 
      SET bio = submission_record.author_bio
      WHERE id = submission_record.user_id 
        AND (bio IS NULL OR bio = '');
      
      -- تحديث bio في جدول authors أيضاً إذا وُجد المؤلف
      UPDATE public.authors 
      SET bio = submission_record.author_bio
      WHERE user_id = submission_record.user_id 
        AND (bio IS NULL OR bio = '');
    END IF;
  END LOOP;
  
  RAISE NOTICE 'تم نقل تعريف المؤلف بنجاح من book_submissions إلى profiles و authors';
END;
$$;

-- تشغيل الدالة لنقل البيانات
SELECT migrate_author_bio_to_profiles();

-- إنشاء دالة لتحديث bio من profiles إلى authors عند التحديث
CREATE OR REPLACE FUNCTION sync_author_bio_from_profiles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- تحديث bio في جدول authors عند تحديث bio في profiles
  UPDATE public.authors 
  SET bio = NEW.bio
  WHERE user_id = NEW.id;
  
  RETURN NEW;
END;
$$;

-- إنشاء trigger لمزامنة bio من profiles إلى authors
DROP TRIGGER IF EXISTS sync_author_bio_trigger ON public.profiles;
CREATE TRIGGER sync_author_bio_trigger
  AFTER UPDATE OF bio ON public.profiles
  FOR EACH ROW
  WHEN (OLD.bio IS DISTINCT FROM NEW.bio)
  EXECUTE FUNCTION sync_author_bio_from_profiles();