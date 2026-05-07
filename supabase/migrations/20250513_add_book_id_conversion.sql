
-- وظيفة مساعدة لتحويل معرف الكتاب النصي إلى UUID
CREATE OR REPLACE FUNCTION public.book_id_to_uuid(p_book_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_book_uuid TEXT;
BEGIN
  -- محاولة تحويل معرف الكتاب إلى UUID
  BEGIN
    -- إذا كان المعرف رقمياً، أنشئ UUID محدد استناداً إليه
    IF p_book_id ~ '^\d+$' THEN
      CASE p_book_id
        WHEN '1' THEN
          RETURN 'a87ff679-a2f3-e71d-9181-a67b7542122c';
        WHEN '2' THEN
          RETURN 'c81e728d-9d4c-2f63-6869-9cf0ce3a777d';
        WHEN '3' THEN
          RETURN 'eccbc87e-4b5c-e2fe-2830-8fd9f2a7baf3';
        WHEN '4' THEN
          RETURN '8f14e45f-ceea-467a-9575-6290f2ec566d';
        WHEN '5' THEN
          RETURN 'e4da3b7f-bbce-4360-9fbe-0ce737fb0cbd';
        ELSE
          -- تحويل أي رقم آخر إلى UUID باستخدام MD5 للحصول على نتيجة متسقة
          RETURN MD5(p_book_id)::TEXT;
      END CASE;
    ELSE
      -- إذا كان المعرف بالفعل بتنسيق UUID أو نص آخر، نعيده كما هو
      RETURN p_book_id;
    END IF;
  EXCEPTION WHEN others THEN
    -- في حال حدوث خطأ، نعيد معرف الكتاب كما هو
    RETURN p_book_id;
  END;
END;
$$;

-- تعديل وظيفة add_book_review لاستخدام وظيفة تحويل المعرف الجديدة
DROP FUNCTION IF EXISTS public.add_book_review(TEXT, UUID, INTEGER, TEXT, BOOLEAN);

CREATE OR REPLACE FUNCTION public.add_book_review(
  p_book_id TEXT,
  p_user_id UUID,
  p_rating INTEGER,
  p_comment TEXT DEFAULT NULL,
  p_recommend BOOLEAN DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_review_id UUID;
  v_book_uuid TEXT;
BEGIN
  -- استخدام وظيفة التحويل الجديدة
  v_book_uuid := book_id_to_uuid(p_book_id);

  INSERT INTO public.book_reviews(book_id, user_id, rating, comment, recommend)
  VALUES (v_book_uuid, p_user_id, p_rating, p_comment, p_recommend)
  RETURNING id INTO v_review_id;
  
  RETURN v_review_id;
END;
$$;

-- تعديل وظيفة get_book_reviews لاستخدام وظيفة تحويل المعرف الجديدة
DROP FUNCTION IF EXISTS public.get_book_reviews(TEXT);

CREATE OR REPLACE FUNCTION public.get_book_reviews(
  p_book_id TEXT
) 
RETURNS TABLE (
  id UUID,
  book_id TEXT,
  user_id UUID,
  rating INTEGER,
  comment TEXT,
  recommend BOOLEAN,
  created_at TIMESTAMPTZ,
  username TEXT,
  avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_book_uuid TEXT;
BEGIN
  -- استخدام وظيفة التحويل الجديدة
  v_book_uuid := book_id_to_uuid(p_book_id);

  RETURN QUERY 
  SELECT 
    br.id,
    br.book_id,
    br.user_id,
    br.rating,
    br.comment,
    br.recommend,
    br.created_at,
    p.username,
    p.avatar_url
  FROM 
    public.book_reviews br
  LEFT JOIN 
    public.profiles p ON br.user_id = p.id
  WHERE 
    br.book_id = v_book_uuid
  ORDER BY 
    br.created_at DESC;
END;
$$;

-- تعديل وظيفة has_user_reviewed لاستخدام وظيفة تحويل المعرف الجديدة
DROP FUNCTION IF EXISTS public.has_user_reviewed(TEXT, UUID);

CREATE OR REPLACE FUNCTION public.has_user_reviewed(
  p_book_id TEXT,
  p_user_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_book_uuid TEXT;
BEGIN
  -- استخدام وظيفة التحويل الجديدة
  v_book_uuid := book_id_to_uuid(p_book_id);

  RETURN EXISTS (
    SELECT 1
    FROM public.book_reviews
    WHERE book_id = v_book_uuid
    AND user_id = p_user_id
  );
END;
$$;
