
-- إنشاء دالة لإنشاء كتاب معتمد عند الموافقة عليه
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

-- إنشاء التريغر
DROP TRIGGER IF EXISTS create_approved_book_on_approval ON public.book_submissions;
CREATE TRIGGER create_approved_book_on_approval
  AFTER UPDATE ON public.book_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.create_approved_book_trigger();

-- دالة لجلب جميع الكتب المعتمدة
CREATE OR REPLACE FUNCTION public.get_approved_books()
RETURNS TABLE (
  id TEXT,
  title TEXT,
  author TEXT,
  category TEXT,
  description TEXT,
  cover_image TEXT,
  book_type TEXT,
  views INTEGER,
  rating NUMERIC,
  is_free BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ab.id::text,
    ab.title,
    ab.author,
    ab.category,
    ab.description,
    ab.cover_image_url,
    'uploaded'::text as book_type,
    ab.views,
    ab.rating,
    true as is_free,
    ab.created_at
  FROM public.approved_books ab
  WHERE ab.is_active = true
  ORDER BY ab.created_at DESC;
END;
$$;

-- دالة للحصول على تفاصيل كتاب واحد
CREATE OR REPLACE FUNCTION public.get_book_details(p_book_id TEXT)
RETURNS TABLE (
  id TEXT,
  title TEXT,
  subtitle TEXT,
  author TEXT,
  category TEXT,
  publisher TEXT,
  translator TEXT,
  description TEXT,
  language TEXT,
  publication_year INTEGER,
  page_count INTEGER,
  cover_image_url TEXT,
  book_file_url TEXT,
  file_type TEXT,
  display_type TEXT,
  views INTEGER,
  rating NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE,
  user_email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  book_uuid UUID;
BEGIN
  -- تحويل النص إلى UUID إذا أمكن
  BEGIN
    book_uuid := p_book_id::UUID;
  EXCEPTION WHEN others THEN
    RETURN;
  END;
  
  RETURN QUERY
  SELECT 
    ab.id::text,
    ab.title,
    ab.subtitle,
    ab.author,
    ab.category,
    ab.publisher,
    ab.translator,
    ab.description,
    ab.language,
    ab.publication_year,
    ab.page_count,
    ab.cover_image_url,
    ab.book_file_url,
    ab.file_type,
    ab.display_type,
    ab.views,
    ab.rating,
    ab.created_at,
    ab.user_email
  FROM public.approved_books ab
  WHERE ab.id = book_uuid
    AND ab.is_active = true;
END;
$$;
