-- تعطيل trigger منع الكتب المكررة مؤقتاً
DROP TRIGGER IF EXISTS trigger_prevent_duplicate_book_submission ON public.book_submissions;

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