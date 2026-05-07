-- إصلاح المشكلة بحذف الدالة الموجودة أولاً
DROP FUNCTION IF EXISTS get_book_details(text) CASCADE;

-- إنشاء دالة ذكية للحصول على تعريف المؤلف
CREATE OR REPLACE FUNCTION get_author_bio_smart(p_book_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_book_record RECORD;
  v_author_bio text := NULL;
  v_is_admin boolean := false;
BEGIN
  -- جلب بيانات الكتاب
  SELECT user_id, author, author_bio
  INTO v_book_record
  FROM public.book_submissions
  WHERE id = p_book_id AND status = 'approved';
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- التحقق إذا كان المستخدم admin
  SELECT EXISTS(
    SELECT 1 FROM public.admin_users 
    WHERE user_id = v_book_record.user_id AND is_active = true
  ) INTO v_is_admin;
  
  -- إذا كان admin، ابحث في جدول authors أولاً، ثم author_bio
  IF v_is_admin THEN
    SELECT bio INTO v_author_bio
    FROM public.authors
    WHERE LOWER(TRIM(name)) = LOWER(TRIM(v_book_record.author))
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- إذا لم يوجد في authors، استخدم author_bio من book_submissions
    IF v_author_bio IS NULL OR v_author_bio = '' THEN
      v_author_bio := v_book_record.author_bio;
    END IF;
  ELSE
    -- إذا لم يكن admin، ابحث في profiles أولاً
    SELECT bio INTO v_author_bio
    FROM public.profiles
    WHERE id = v_book_record.user_id;
    
    -- إذا لم يوجد في profiles، ابحث في authors
    IF v_author_bio IS NULL OR v_author_bio = '' THEN
      SELECT bio INTO v_author_bio
      FROM public.authors
      WHERE LOWER(TRIM(name)) = LOWER(TRIM(v_book_record.author))
      ORDER BY created_at DESC
      LIMIT 1;
    END IF;
    
    -- أخيراً، استخدم author_bio من book_submissions
    IF v_author_bio IS NULL OR v_author_bio = '' THEN
      v_author_bio := v_book_record.author_bio;
    END IF;
  END IF;
  
  RETURN v_author_bio;
END;
$$;

-- إعادة إنشاء دالة get_book_details مع التعريف الذكي
CREATE OR REPLACE FUNCTION get_book_details(p_book_id text)
RETURNS TABLE(
  id uuid,
  title text,
  subtitle text,
  author text,
  author_image_url text,
  author_bio text,
  category text,
  description text,
  language text,
  publication_year integer,
  page_count integer,
  publisher text,
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
  v_book_uuid uuid;
BEGIN
  -- تحويل ID إلى UUID
  v_book_uuid := public.book_id_to_uuid(p_book_id);
  
  RETURN QUERY
  SELECT 
    bs.id,
    bs.title,
    bs.subtitle,
    bs.author,
    bs.author_image_url,
    public.get_author_bio_smart(bs.id) as author_bio,
    bs.category,
    bs.description,
    bs.language,
    bs.publication_year,
    bs.page_count,
    bs.publisher,
    bs.cover_image_url,
    bs.book_file_url,
    bs.file_type,
    bs.display_type,
    bs.views,
    bs.rating,
    bs.created_at,
    bs.user_email,
    bs.file_size,
    bs.slug
  FROM public.book_submissions bs
  WHERE (bs.id = v_book_uuid OR bs.slug = p_book_id)
    AND bs.status = 'approved'
  ORDER BY 
    CASE WHEN bs.id = v_book_uuid THEN 1 ELSE 2 END
  LIMIT 1;
END;
$$;