-- إصلاح دالة إنشاء slug لحل مشكلة التصاق اسم الكتاب باسم المؤلف
CREATE OR REPLACE FUNCTION public.generate_book_slug(p_title text, p_author text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_clean_title text;
  v_clean_author text;
  v_slug text;
  v_counter integer := 0;
  v_final_slug text;
BEGIN
  -- تنظيف العنوان بشكل منفصل
  v_clean_title := TRIM(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        TRIM(p_title),
        '[^\\u0600-\\u06FF\\u0750-\\u077Fa-zA-Z0-9\\s]', '', 'g'
      ),
      '\\s+', ' ', 'g'
    )
  );
  
  -- تنظيف اسم المؤلف بشكل منفصل
  v_clean_author := TRIM(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        TRIM(p_author),
        '[^\\u0600-\\u06FF\\u0750-\\u077Fa-zA-Z0-9\\s]', '', 'g'
      ),
      '\\s+', ' ', 'g'
    )
  );
  
  -- دمج العنوان والمؤلف مع مساحة للفصل
  v_slug := LOWER(
    REGEXP_REPLACE(
      TRIM(v_clean_title || ' ' || v_clean_author),
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

-- إعادة إنشاء slugs للكتب الموجودة
UPDATE public.book_submissions 
SET slug = public.generate_book_slug(title, author)
WHERE status = 'approved';