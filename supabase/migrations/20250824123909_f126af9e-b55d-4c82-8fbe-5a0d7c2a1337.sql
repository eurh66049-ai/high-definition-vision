-- إزالة الدوال المعطلة واستبدالها بدوال محسنة

-- حذف الدوال القديمة إذا كانت موجودة
DROP FUNCTION IF EXISTS find_existing_book_with_normalized_author(text, text, text);
DROP FUNCTION IF EXISTS find_author_by_normalized_name(text);
DROP FUNCTION IF EXISTS normalize_author_name(text);

-- إنشاء دالة تطبيع أسماء المؤلفين محسنة
CREATE OR REPLACE FUNCTION normalize_author_name(author_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF author_name IS NULL OR author_name = '' THEN
    RETURN '';
  END IF;
  
  -- تطبيع النص: إزالة المسافات الزائدة وتوحيد الأحرف
  RETURN TRIM(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        LOWER(author_name),
        '[أإآ]', 'ا', 'g'
      ),
      '\s+', ' ', 'g'
    )
  );
END;
$$;

-- إنشاء دالة البحث عن المؤلف بالاسم المطبع
CREATE OR REPLACE FUNCTION find_author_by_normalized_name(author_name text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  author_id uuid;
  normalized_name text;
BEGIN
  IF author_name IS NULL OR author_name = '' THEN
    RETURN NULL;
  END IF;
  
  normalized_name := normalize_author_name(author_name);
  
  SELECT id INTO author_id
  FROM authors
  WHERE normalize_author_name(name) = normalized_name
  LIMIT 1;
  
  RETURN author_id;
END;
$$;

-- إنشاء دالة البحث عن الكتب المكررة محسنة
CREATE OR REPLACE FUNCTION find_existing_book_with_normalized_author(p_title text, p_author text, p_status text)
RETURNS TABLE(id uuid, title text, author text, status text)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  normalized_title text;
  normalized_author text;
BEGIN
  IF p_title IS NULL OR p_title = '' OR p_author IS NULL OR p_author = '' THEN
    RETURN;
  END IF;
  
  -- تطبيع العنوان والمؤلف
  normalized_title := TRIM(LOWER(p_title));
  normalized_author := normalize_author_name(p_author);
  
  RETURN QUERY
  SELECT 
    bs.id,
    bs.title,
    bs.author,
    bs.status
  FROM book_submissions bs
  WHERE 
    TRIM(LOWER(bs.title)) = normalized_title
    AND normalize_author_name(bs.author) = normalized_author
    AND bs.status = p_status
  LIMIT 1;
END;
$$;