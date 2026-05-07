
-- إصلاح دالة generate_book_slug: المهرب \\u كان مزدوجاً فلا يطابق العربي
CREATE OR REPLACE FUNCTION public.generate_book_slug(p_title text, p_author text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_slug text;
  v_counter integer := 0;
  v_final_slug text;
BEGIN
  v_slug := LOWER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        TRIM(COALESCE(p_title,'') || '-' || COALESCE(p_author,'')),
        '[^\u0600-\u06FF\u0750-\u077Fa-zA-Z0-9\s-]', '', 'g'
      ),
      '\s+', '-', 'g'
    )
  );

  v_slug := REGEXP_REPLACE(v_slug, '-+', '-', 'g');
  v_slug := REGEXP_REPLACE(v_slug, '^-+|-+$', '', 'g');

  IF v_slug IS NULL OR v_slug = '' THEN
    v_slug := 'book-' || substr(md5(random()::text), 1, 8);
  END IF;

  v_final_slug := v_slug;

  WHILE EXISTS (SELECT 1 FROM public.approved_books WHERE slug = v_final_slug) LOOP
    v_counter := v_counter + 1;
    v_final_slug := v_slug || '-' || v_counter;
  END LOOP;

  RETURN v_final_slug;
END;
$$;

-- إعادة إنشاء روابط الكتب التي تنتهي بلاحقة عشوائية من 6 أحرف/أرقام
-- (الناتجة من Math.random().toString(36).slice(2,8) في edge function القديمة)
UPDATE public.approved_books ab
SET slug = NULL
WHERE slug ~ '-[a-z0-9]{6}$'
  AND slug !~ '-[0-9]+$'; -- استثناء اللواحق الرقمية الصحيحة

-- تشغيل الترايجر بتعيين slug جديد
UPDATE public.approved_books
SET slug = public.generate_book_slug(title, author)
WHERE slug IS NULL OR slug = '';
