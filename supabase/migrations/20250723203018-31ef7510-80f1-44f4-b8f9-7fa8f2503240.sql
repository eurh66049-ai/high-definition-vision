-- إضافة حقل slug لجدول authors
ALTER TABLE public.authors 
ADD COLUMN IF NOT EXISTS slug text;

-- إنشاء فهرس للـ slug
CREATE INDEX IF NOT EXISTS idx_authors_slug ON public.authors(slug);

-- دالة لإنشاء slug للمؤلفين
CREATE OR REPLACE FUNCTION public.generate_author_slug(p_name text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_slug text;
  v_counter integer := 0;
  v_final_slug text;
BEGIN
  -- تنظيف الاسم وتحويله إلى slug
  v_slug := LOWER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        TRIM(COALESCE(p_name, '')),
        '[^\u0600-\u06FF\u0750-\u077Fa-zA-Z0-9\s]', '', 'g'
      ),
      '\s+', '-', 'g'
    )
  );
  
  -- إزالة الشرطات في البداية والنهاية
  v_slug := REGEXP_REPLACE(v_slug, '^-+|-+$', '', 'g');
  
  -- التأكد من أن الـ slug ليس فارغاً
  IF v_slug = '' OR v_slug IS NULL THEN
    v_slug := 'author-' || extract(epoch from now())::bigint;
  END IF;
  
  v_final_slug := v_slug;
  
  -- التحقق من التفرد وإضافة رقم إذا لزم الأمر
  WHILE EXISTS (SELECT 1 FROM public.authors WHERE slug = v_final_slug) LOOP
    v_counter := v_counter + 1;
    v_final_slug := v_slug || '-' || v_counter;
  END LOOP;
  
  RETURN v_final_slug;
END;
$$;

-- إنشاء trigger لتوليد slug تلقائياً للمؤلفين الجدد
CREATE OR REPLACE FUNCTION public.auto_generate_author_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- إنشاء slug إذا لم يكن موجوداً
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.generate_author_slug(NEW.name);
  END IF;
  
  RETURN NEW;
END;
$$;

-- إضافة trigger للمؤلفين
DROP TRIGGER IF EXISTS trigger_auto_generate_author_slug ON public.authors;
CREATE TRIGGER trigger_auto_generate_author_slug
  BEFORE INSERT OR UPDATE ON public.authors
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_author_slug();

-- تحديث الـ slugs للمؤلفين الموجودين
UPDATE public.authors 
SET slug = public.generate_author_slug(name)
WHERE slug IS NULL OR slug = '';

-- دالة للبحث عن المؤلف بالـ slug أو الاسم
CREATE OR REPLACE FUNCTION public.get_author_by_slug_or_name(p_identifier text)
RETURNS TABLE(
  id uuid,
  name text,
  bio text,
  avatar_url text,
  website text,
  email text,
  social_links jsonb,
  books_count integer,
  followers_count integer,
  created_at timestamp with time zone,
  user_id uuid,
  slug text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- البحث بالـ slug أولاً
  RETURN QUERY
  SELECT 
    a.id,
    a.name,
    a.bio,
    a.avatar_url,
    a.website,
    a.email,
    a.social_links,
    a.books_count,
    a.followers_count,
    a.created_at,
    a.user_id,
    a.slug
  FROM public.authors a
  WHERE a.slug = p_identifier;
  
  -- إذا لم توجد نتائج، ابحث بالاسم
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      a.id,
      a.name,
      a.bio,
      a.avatar_url,
      a.website,
      a.email,
      a.social_links,
      a.books_count,
      a.followers_count,
      a.created_at,
      a.user_id,
      a.slug
    FROM public.authors a
    WHERE LOWER(a.name) = LOWER(p_identifier);
  END IF;
END;
$$;