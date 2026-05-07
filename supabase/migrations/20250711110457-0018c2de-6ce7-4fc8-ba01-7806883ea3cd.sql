-- إضافة حقل slug لجدول book_submissions
ALTER TABLE public.book_submissions 
ADD COLUMN IF NOT EXISTS slug text;

-- إنشاء فهرس للـ slug
CREATE INDEX IF NOT EXISTS idx_book_submissions_slug ON public.book_submissions(slug);

-- دالة لإنشاء slug من العنوان والمؤلف
CREATE OR REPLACE FUNCTION public.generate_book_slug(p_title text, p_author text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_slug text;
  v_counter integer := 0;
  v_final_slug text;
BEGIN
  -- تنظيف النص وتحويله إلى slug
  v_slug := LOWER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        TRIM(p_title || '-' || p_author),
        '[^\\u0600-\\u06FF\\u0750-\\u077Fa-zA-Z0-9\\s]', '', 'g'
      ),
      '\\s+', '-', 'g'
    )
  );
  
  -- إزالة الشرطات المتعددة والشرطات في البداية والنهاية
  v_slug := REGEXP_REPLACE(v_slug, '^-+|-+$', '', 'g');
  v_slug := REGEXP_REPLACE(v_slug, '-+', '-', 'g');
  
  v_final_slug := v_slug;
  
  -- التحقق من التفرد وإضافة رقم إذا لزم الأمر
  WHILE EXISTS (SELECT 1 FROM public.book_submissions WHERE slug = v_final_slug AND status = 'approved') LOOP
    v_counter := v_counter + 1;
    v_final_slug := v_slug || '-' || v_counter;
  END LOOP;
  
  RETURN v_final_slug;
END;
$$;

-- تحديث الكتب الموجودة لإنشاء slugs
UPDATE public.book_submissions 
SET slug = public.generate_book_slug(title, author)
WHERE status = 'approved' AND (slug IS NULL OR slug = '');

-- تحديث view approved_books لتشمل slug
CREATE OR REPLACE VIEW public.approved_books AS
SELECT 
    book_submissions.id,
    book_submissions.user_id,
    book_submissions.title,
    book_submissions.subtitle,
    book_submissions.author,
    book_submissions.author_bio,
    book_submissions.author_image_url,
    book_submissions.category,
    book_submissions.publisher,
    book_submissions.translator,
    book_submissions.description,
    book_submissions.publication_year,
    book_submissions.page_count,
    book_submissions.language,
    book_submissions.display_type,
    book_submissions.cover_image_url,
    book_submissions.book_file_url,
    book_submissions.file_type,
    book_submissions.file_size,
    book_submissions.file_metadata,
    book_submissions.rights_confirmation,
    book_submissions.created_at,
    book_submissions.reviewed_at,
    book_submissions.user_email,
    book_submissions.processing_status,
    book_submissions.views,
    book_submissions.rating,
    book_submissions.slug,
    true AS is_active
FROM book_submissions
WHERE (book_submissions.status = 'approved'::text);

-- إنشاء trigger لإنشاء slug تلقائياً للكتب الجديدة
CREATE OR REPLACE FUNCTION public.auto_generate_book_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- إنشاء slug إذا لم يكن موجوداً وتمت الموافقة على الكتاب
  IF NEW.status = 'approved' AND (NEW.slug IS NULL OR NEW.slug = '') THEN
    NEW.slug := public.generate_book_slug(NEW.title, NEW.author);
  END IF;
  
  RETURN NEW;
END;
$$;

-- إضافة trigger لـ book_submissions
DROP TRIGGER IF EXISTS trigger_auto_generate_book_slug ON public.book_submissions;
CREATE TRIGGER trigger_auto_generate_book_slug
  BEFORE INSERT OR UPDATE ON public.book_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_book_slug();