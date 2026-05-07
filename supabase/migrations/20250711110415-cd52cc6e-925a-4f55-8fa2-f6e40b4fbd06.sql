-- إضافة حقل slug لجدول approved_books
ALTER TABLE public.approved_books 
ADD COLUMN IF NOT EXISTS slug text;

-- إنشاء فهرس فريد للـ slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_approved_books_slug ON public.approved_books(slug);

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
  WHILE EXISTS (SELECT 1 FROM public.approved_books WHERE slug = v_final_slug) LOOP
    v_counter := v_counter + 1;
    v_final_slug := v_slug || '-' || v_counter;
  END LOOP;
  
  RETURN v_final_slug;
END;
$$;

-- تحديث الكتب الموجودة لإنشاء slugs
UPDATE public.approved_books 
SET slug = public.generate_book_slug(title, author)
WHERE slug IS NULL OR slug = '';

-- تحديث دالة get_book_details لتقبل slug أو UUID
CREATE OR REPLACE FUNCTION public.get_book_details(p_book_id text)
 RETURNS TABLE(
   id text, 
   title text, 
   subtitle text, 
   author text, 
   author_bio text, 
   author_image_url text, 
   category text, 
   description text, 
   language text, 
   publication_year integer, 
   page_count integer, 
   cover_image_url text, 
   book_file_url text, 
   file_type text, 
   display_type text, 
   views integer, 
   rating numeric, 
   created_at timestamp with time zone, 
   user_email text, 
   file_size bigint,
   slug text
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
DECLARE
  book_uuid UUID;
BEGIN
  -- أولاً، محاولة البحث بـ slug
  RETURN QUERY
  SELECT 
    ab.id::text,
    ab.title,
    ab.subtitle,
    ab.author,
    COALESCE(ab.author_bio, bs.author_bio) as author_bio,
    COALESCE(ab.author_image_url, bs.author_image_url) as author_image_url,
    ab.category,
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
    ab.user_email,
    ab.file_size,
    ab.slug
  FROM public.approved_books ab
  LEFT JOIN public.book_submissions bs ON ab.submission_id = bs.id
  WHERE ab.slug = p_book_id
    AND ab.is_active = true;
  
  -- إذا لم نجد نتيجة بـ slug، نحاول بـ UUID
  IF NOT FOUND THEN
    BEGIN
      book_uuid := p_book_id::UUID;
      
      RETURN QUERY
      SELECT 
        ab.id::text,
        ab.title,
        ab.subtitle,
        ab.author,
        COALESCE(ab.author_bio, bs.author_bio) as author_bio,
        COALESCE(ab.author_image_url, bs.author_image_url) as author_image_url,
        ab.category,
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
        ab.user_email,
        ab.file_size,
        ab.slug
      FROM public.approved_books ab
      LEFT JOIN public.book_submissions bs ON ab.submission_id = bs.id
      WHERE ab.id = book_uuid
        AND ab.is_active = true;
        
    EXCEPTION WHEN others THEN
      -- إذا فشل تحويل UUID، لا نفعل شيئاً
      RETURN;
    END;
  END IF;
END;
$$;

-- إنشاء trigger لإنشاء slug تلقائياً للكتب الجديدة
CREATE OR REPLACE FUNCTION public.auto_generate_book_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- إنشاء slug إذا لم يكن موجوداً
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.generate_book_slug(NEW.title, NEW.author);
  END IF;
  
  RETURN NEW;
END;
$$;

-- إضافة trigger للكتب المعتمدة
DROP TRIGGER IF EXISTS trigger_auto_generate_book_slug ON public.approved_books;
CREATE TRIGGER trigger_auto_generate_book_slug
  BEFORE INSERT OR UPDATE ON public.approved_books
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_book_slug();