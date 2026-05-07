-- إضافة عمود submission_id إلى جدول approved_books لربط الكتب المعتمدة بطلبات الرفع الأصلية
ALTER TABLE public.approved_books 
ADD COLUMN submission_id uuid;

-- إنشاء فهرس للبحث السريع
CREATE INDEX idx_approved_books_submission_id ON public.approved_books(submission_id);

-- إضافة قيد فريد لضمان عدم وجود أكثر من كتاب معتمد لنفس الطلب
ALTER TABLE public.approved_books 
ADD CONSTRAINT unique_submission_id UNIQUE (submission_id);

-- تحديث الدالة لتعمل بشكل صحيح مع العمود الجديد
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
  
  -- التحقق من عدم وجود كتاب منشور مسبقاً لنفس الطلب
  IF EXISTS (SELECT 1 FROM public.approved_books WHERE submission_id = p_submission_id) THEN
    RAISE EXCEPTION 'تم إنشاء كتاب لهذا الطلب مسبقاً';
  END IF;
  
  -- إنشاء الكتاب المعتمد
  INSERT INTO public.approved_books (
    submission_id,
    title,
    subtitle,
    author,
    author_bio,
    author_image_url,
    category,
    publisher,
    translator,
    description,
    language,
    publication_year,
    page_count,
    cover_image_url,
    book_file_url,
    file_type,
    file_size,
    file_metadata,
    display_type,
    rights_confirmation,
    user_id,
    user_email,
    created_at,
    reviewed_at,
    processing_status,
    views,
    rating,
    is_active
  ) VALUES (
    submission_record.id,
    submission_record.title,
    submission_record.subtitle,
    submission_record.author,
    submission_record.author_bio,
    submission_record.author_image_url,
    submission_record.category,
    submission_record.publisher,
    submission_record.translator,
    submission_record.description,
    submission_record.language,
    submission_record.publication_year,
    submission_record.page_count,
    submission_record.cover_image_url,
    submission_record.book_file_url,
    submission_record.file_type,
    submission_record.file_size,
    submission_record.file_metadata,
    submission_record.display_type,
    submission_record.rights_confirmation,
    submission_record.user_id,
    submission_record.user_email,
    submission_record.created_at,
    submission_record.reviewed_at,
    submission_record.processing_status,
    COALESCE(submission_record.views, 0),
    COALESCE(submission_record.rating, 0),
    true
  ) RETURNING id INTO v_book_id;
  
  -- إرسال إشعار للمستخدم بنشر الكتاب
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
  
  RETURN v_book_id;
END;
$function$;