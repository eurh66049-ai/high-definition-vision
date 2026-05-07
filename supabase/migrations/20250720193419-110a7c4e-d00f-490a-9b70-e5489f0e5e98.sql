-- تعديل دالة معالجة المستخدمين الجدد لإضافة رسالة ترحيب
CREATE OR REPLACE FUNCTION public.handle_new_user_with_google_avatar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- إنشاء ملف شخصي للمستخدم الجديد
  INSERT INTO public.profiles (
    id,
    username,
    email,
    avatar_url
  ) VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data ->> 'name',
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.email
    ),
    NEW.email,
    -- استخدام صورة Google إذا كانت متوفرة
    CASE 
      WHEN NEW.raw_user_meta_data ->> 'avatar_url' IS NOT NULL 
        OR NEW.raw_user_meta_data ->> 'picture' IS NOT NULL 
      THEN COALESCE(
        NEW.raw_user_meta_data ->> 'avatar_url',
        NEW.raw_user_meta_data ->> 'picture'
      )
      ELSE NULL
    END
  );
  
  -- إضافة رسالة ترحيب للمستخدم الجديد
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    created_at
  ) VALUES (
    NEW.id,
    'أهلاً بك في "كتبي" – بيت كل قارئ وكاتب عربي 🎉',
    'في "كتبي"، نؤمن أن كل كتاب هو بداية جديدة، وأن كل قارئ يستحق فرصة لاكتشاف عالم مختلف. منصتنا ما زالت في بدايتها، لكننا نكبر مع كل صفحة تُقرأ، ومع كل كتاب يُضاف.

هنا يمكنك تصفّح الكتب، مشاركتها، أو حتى نشر كتابك الخاص بكل سهولة.

انضم إلينا وكن جزءًا من هذا الحلم الثقافي العربي منذ خطواته الأولى.',
    'success',
    NOW()
  );
  
  RETURN NEW;
END;
$function$;