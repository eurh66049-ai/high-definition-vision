-- إصلاح دالة generate_book_slug للتعامل مع الأحرف العربية
CREATE OR REPLACE FUNCTION public.generate_book_slug(p_title text, p_author text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_slug text;
  v_counter integer := 0;
  v_final_slug text;
BEGIN
  -- دمج العنوان والمؤلف مباشرة
  v_slug := TRIM(COALESCE(p_title, '') || ' ' || COALESCE(p_author, ''));
  
  -- إزالة المساحات الزائدة واستبدالها بشرطات
  v_slug := REGEXP_REPLACE(v_slug, '\s+', '-', 'g');
  
  -- إزالة الشرطات في البداية والنهاية
  v_slug := REGEXP_REPLACE(v_slug, '^-+|-+$', '', 'g');
  
  -- التأكد من أن الـ slug ليس فارغاً
  IF v_slug = '' OR v_slug IS NULL THEN
    v_slug := 'book-' || extract(epoch from now())::bigint;
  END IF;
  
  v_final_slug := v_slug;
  
  -- التحقق من التفرد وإضافة رقم إذا لزم الأمر
  WHILE EXISTS (SELECT 1 FROM public.book_submissions WHERE slug = v_final_slug AND status = 'approved' AND id != '6d950702-38b8-4b3e-8783-a0b0f653358f'::uuid) LOOP
    v_counter := v_counter + 1;
    v_final_slug := v_slug || '-' || v_counter;
  END LOOP;
  
  RETURN v_final_slug;
END;
$$;

-- تحديث الـ slug للكتاب الموجود
UPDATE public.book_submissions 
SET slug = public.generate_book_slug(title, author)
WHERE id = '6d950702-38b8-4b3e-8783-a0b0f653358f';