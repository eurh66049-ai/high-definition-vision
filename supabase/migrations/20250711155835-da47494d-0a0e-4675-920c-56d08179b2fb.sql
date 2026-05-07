-- تحديث الدالة لتعمل مع جدول book_submissions بدلاً من view approved_books
CREATE OR REPLACE FUNCTION public.create_approved_book_from_submission(p_submission_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_book_id uuid;
  submission_record RECORD;
BEGIN
  -- جلب بيانات الطلب
  SELECT * INTO submission_record 
  FROM public.book_submissions 
  WHERE id = p_submission_id AND status = 'approved';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'لم يتم العثور على طلب كتاب معتمد بهذا المعرف';
  END IF;
  
  -- التحقق من أن الكتاب معتمد بالفعل
  IF submission_record.status != 'approved' THEN
    RAISE EXCEPTION 'هذا الكتاب غير معتمد بعد';
  END IF;
  
  -- الكتاب المعتمد موجود بالفعل في view approved_books
  -- لذا نعيد ID الموجود
  v_book_id := submission_record.id;
  
  -- إرسال إشعار للمستخدم بنشر الكتاب (إذا لم يكن موجوداً)
  IF NOT EXISTS (
    SELECT 1 FROM public.notifications 
    WHERE book_submission_id = submission_record.id 
    AND type = 'success' 
    AND title LIKE '%نشر%'
  ) THEN
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      book_submission_id,
      book_title,
      book_author,
      book_category
    ) VALUES (
      submission_record.user_id,
      'تم نشر كتابك! 📚',
      'كتاب "' || submission_record.title || '" أصبح متاحاً الآن للقراء في المكتبة.',
      'success',
      submission_record.id,
      submission_record.title,
      submission_record.author,
      submission_record.category
    );
  END IF;
  
  RETURN v_book_id;
END;
$function$;

-- إضافة slug إلى useOptimizedBooks للتأكد من وجود slug للكتب المعتمدة
-- تحديث hook ليتضمن slug من book_submissions
-- نحتاج أيضاً للتأكد من وجود slugs للكتب المعتمدة
UPDATE public.book_submissions 
SET slug = public.generate_book_slug(title, author)
WHERE status = 'approved' 
AND (slug IS NULL OR slug = '');

-- دالة للتحقق من سلامة البيانات وإصلاح أي مشاكل
CREATE OR REPLACE FUNCTION public.fix_book_submission_issues()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  fixed_count integer := 0;
  book_record RECORD;
BEGIN
  -- إصلاح الـ slugs المفقودة
  FOR book_record IN 
    SELECT id, title, author FROM public.book_submissions 
    WHERE status = 'approved' AND (slug IS NULL OR slug = '')
  LOOP
    UPDATE public.book_submissions 
    SET slug = public.generate_book_slug(book_record.title, book_record.author)
    WHERE id = book_record.id;
    
    fixed_count := fixed_count + 1;
  END LOOP;
  
  RETURN 'تم إصلاح ' || fixed_count || ' كتاب';
END;
$function$;

-- تشغيل الإصلاح
SELECT public.fix_book_submission_issues();