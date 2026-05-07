-- حل مشكلة تكرار المؤلفين بسبب اختلاف الكتابة
-- مثال: "فيكتور هوجو" و "فيكتور هيجو" هما نفس المؤلف

-- 1. إنشاء دالة لتطبيع أسماء المؤلفين
CREATE OR REPLACE FUNCTION public.normalize_author_name(author_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  normalized_name text;
BEGIN
  -- إزالة المسافات الزائدة وتحويل إلى أحرف صغيرة
  normalized_name := LOWER(TRIM(author_name));
  
  -- تطبيع الأحرف العربية المختلفة
  normalized_name := REPLACE(normalized_name, 'أ', 'ا');
  normalized_name := REPLACE(normalized_name, 'إ', 'ا');
  normalized_name := REPLACE(normalized_name, 'آ', 'ا');
  normalized_name := REPLACE(normalized_name, 'ة', 'ه');
  normalized_name := REPLACE(normalized_name, 'ى', 'ي');
  
  -- تطبيع أسماء المؤلفين المشهورين المتشابهة
  normalized_name := REPLACE(normalized_name, 'هيجو', 'هوجو');
  normalized_name := REPLACE(normalized_name, 'هيغو', 'هوجو');
  normalized_name := REPLACE(normalized_name, 'دوستويفسكي', 'دوستويفسكي');
  normalized_name := REPLACE(normalized_name, 'دوستويفسكى', 'دوستويفسكي');
  
  -- إزالة علامات الترقيم
  normalized_name := REGEXP_REPLACE(normalized_name, '[\.،,;:!?""''()[\]{}]', '', 'g');
  
  -- إزالة المسافات المتعددة
  normalized_name := REGEXP_REPLACE(normalized_name, '\s+', ' ', 'g');
  normalized_name := TRIM(normalized_name);
  
  RETURN normalized_name;
END;
$$;

-- 2. إنشاء دالة للعثور على المؤلف بالاسم المطبع
CREATE OR REPLACE FUNCTION public.find_author_by_normalized_name(author_name text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  author_id uuid;
  normalized_input text;
BEGIN
  normalized_input := public.normalize_author_name(author_name);
  
  SELECT id INTO author_id
  FROM public.authors
  WHERE public.normalize_author_name(name) = normalized_input
  LIMIT 1;
  
  RETURN author_id;
END;
$$;

-- 3. دمج المؤلفين المتكررين الموجودين
CREATE OR REPLACE FUNCTION public.merge_duplicate_authors()
RETURNS TABLE(original_name text, merged_with text, books_transferred integer)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  author_record RECORD;
  main_author_id uuid;
  books_count integer;
BEGIN
  -- العثور على المؤلفين المتكررين وإرجاع المعلومات
  FOR author_record IN 
    SELECT a1.id as duplicate_id, a1.name as duplicate_name, a2.id as main_id, a2.name as main_name
    FROM public.authors a1
    JOIN public.authors a2 ON public.normalize_author_name(a1.name) = public.normalize_author_name(a2.name)
    WHERE a1.id != a2.id AND a1.created_at > a2.created_at
  LOOP
    -- تحديث book_submissions للإشارة إلى المؤلف الرئيسي
    UPDATE public.book_submissions
    SET author = author_record.main_name
    WHERE LOWER(TRIM(author)) = LOWER(TRIM(author_record.duplicate_name));
    
    GET DIAGNOSTICS books_count = ROW_COUNT;
    
    -- حذف المؤلف المكرر
    DELETE FROM public.authors WHERE id = author_record.duplicate_id;
    
    -- إرجاع المعلومات
    RETURN QUERY SELECT 
      author_record.duplicate_name::text,
      author_record.main_name::text,
      books_count;
  END LOOP;
END;
$$;

-- 4. تحديث دالة مزامنة المؤلفين لاستخدام التطبيع
CREATE OR REPLACE FUNCTION public.sync_authors_from_books()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- إدراج أو تحديث المؤلفين بناءً على كتبهم المعتمدة مع التطبيع
  INSERT INTO public.authors (name, slug, books_count, bio, avatar_url, created_at, user_id, country_code, country_name)
  SELECT 
    bs.author as name,
    public.generate_author_slug(bs.author) as slug,
    COUNT(*) as books_count,
    MAX(bs.author_bio) as bio,
    MAX(bs.author_image_url) as avatar_url,
    MIN(bs.created_at) as created_at,
    (array_agg(bs.user_id ORDER BY bs.created_at))[1] as user_id,
    MAX(bs.author_country_code) as country_code,
    MAX(bs.author_country_name) as country_name
  FROM public.book_submissions bs 
  WHERE bs.status = 'approved' 
    AND bs.author IS NOT NULL 
    AND bs.author != ''
    -- استخدام التطبيع للتحقق من عدم وجود المؤلف
    AND NOT EXISTS (
      SELECT 1 FROM public.authors a 
      WHERE public.normalize_author_name(a.name) = public.normalize_author_name(bs.author)
    )
  GROUP BY bs.author
  ON CONFLICT (name) 
  DO UPDATE SET 
    books_count = EXCLUDED.books_count,
    bio = COALESCE(EXCLUDED.bio, authors.bio),
    avatar_url = COALESCE(EXCLUDED.avatar_url, authors.avatar_url),
    country_code = COALESCE(EXCLUDED.country_code, authors.country_code),
    country_name = COALESCE(EXCLUDED.country_name, authors.country_name);
    
  -- تحديث عدد الكتب للمؤلفين الموجودين مع التطبيع
  UPDATE public.authors 
  SET books_count = book_counts.count,
      bio = COALESCE(book_counts.latest_bio, bio),
      avatar_url = COALESCE(book_counts.latest_avatar, avatar_url)
  FROM (
    SELECT 
      bs.author,
      COUNT(*) as count,
      (array_agg(bs.author_bio ORDER BY bs.created_at DESC))[1] as latest_bio,
      (array_agg(bs.author_image_url ORDER BY bs.created_at DESC))[1] as latest_avatar
    FROM public.book_submissions bs
    WHERE bs.status = 'approved'
      AND bs.author IS NOT NULL
    GROUP BY bs.author
  ) book_counts
  WHERE public.normalize_author_name(authors.name) = public.normalize_author_name(book_counts.author);
END;
$$;

-- 5. تشغيل دمج المؤلفين المتكررين
SELECT * FROM public.merge_duplicate_authors();

-- 6. تشغيل مزامنة المؤلفين المحدثة
SELECT public.sync_authors_from_books();