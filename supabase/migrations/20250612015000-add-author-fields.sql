

-- إضافة حقول المؤلف الجديدة
ALTER TABLE public.book_submissions 
ADD COLUMN IF NOT EXISTS author_bio text,
ADD COLUMN IF NOT EXISTS author_image_url text;

-- تحديث دالة get_book_submissions_data لتشمل الحقول الجديدة
CREATE OR REPLACE FUNCTION get_book_submissions_data(status_filter text)
RETURNS TABLE(
  id uuid,
  title text,
  subtitle text,
  author text,
  author_bio text,
  author_image_url text,
  category text,
  publisher text,
  translator text,
  description text,
  language text,
  publication_year integer,
  page_count integer,
  cover_image_url text,
  book_file_url text,
  file_type text,
  display_type text,
  rights_confirmation boolean,
  created_at timestamp with time zone,
  status text,
  user_id uuid,
  user_email text,
  reviewer_notes text,
  reviewed_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bs.id,
    bs.title,
    bs.subtitle,
    bs.author,
    bs.author_bio,
    bs.author_image_url,
    bs.category,
    bs.publisher,
    bs.translator,
    bs.description,
    bs.language,
    bs.publication_year,
    bs.page_count,
    bs.cover_image_url,
    bs.book_file_url,
    bs.file_type,
    bs.display_type,
    bs.rights_confirmation,
    bs.created_at,
    bs.status,
    bs.user_id,
    bs.user_email,
    bs.reviewer_notes,
    bs.reviewed_at
  FROM public.book_submissions bs
  WHERE bs.status = status_filter
  ORDER BY bs.created_at DESC;
END;
$$;

-- إضافة الحقول الجديدة في جدول approved_books أيضاً
ALTER TABLE public.approved_books 
ADD COLUMN IF NOT EXISTS author_bio text,
ADD COLUMN IF NOT EXISTS author_image_url text;

-- تحديث trigger إنشاء الكتاب المعتمد ليشمل البيانات الجديدة
CREATE OR REPLACE FUNCTION public.create_approved_book_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- عند تغيير الحالة إلى approved، إنشاء كتاب معتمد
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    -- التحقق من عدم وجود كتاب معتمد مسبقاً لنفس الطلب
    IF NOT EXISTS (SELECT 1 FROM public.approved_books WHERE submission_id = NEW.id) THEN
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
        display_type,
        rights_confirmation,
        user_id,
        user_email
      ) VALUES (
        NEW.id,
        NEW.title,
        NEW.subtitle,
        NEW.author,
        NEW.author_bio,
        NEW.author_image_url,
        NEW.category,
        NEW.publisher,
        NEW.translator,
        NEW.description,
        NEW.language,
        NEW.publication_year,
        NEW.page_count,
        NEW.cover_image_url,
        NEW.book_file_url,
        NEW.file_type,
        NEW.display_type,
        NEW.rights_confirmation,
        NEW.user_id,
        NEW.user_email
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

