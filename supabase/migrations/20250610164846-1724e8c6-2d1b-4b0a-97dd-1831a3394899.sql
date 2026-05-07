
-- أولاً: تحديث جميع الروابط الموجودة لإزالة .pdf من النهاية
UPDATE public.approved_books 
SET book_file_url = regexp_replace(book_file_url, '\.pdf(\?.*)?$', '\1', 'i')
WHERE book_file_url IS NOT NULL 
AND (lower(book_file_url) LIKE '%.pdf' OR lower(book_file_url) LIKE '%.pdf?%');

UPDATE public.book_submissions 
SET book_file_url = regexp_replace(book_file_url, '\.pdf(\?.*)?$', '\1', 'i')
WHERE book_file_url IS NOT NULL 
AND (lower(book_file_url) LIKE '%.pdf' OR lower(book_file_url) LIKE '%.pdf?%');

-- ثانياً: إنشاء دالة التحقق من الرابط
CREATE OR REPLACE FUNCTION public.validate_non_pdf_url(p_url text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- التحقق من أن الرابط موجود وليس فارغ
  IF p_url IS NULL OR p_url = '' THEN
    RETURN true; -- السماح بالقيم الفارغة
  END IF;
  
  -- التحقق من أن الرابط لا ينتهي بـ .pdf
  RETURN NOT (lower(p_url) LIKE '%.pdf' OR lower(p_url) LIKE '%.pdf?%');
END;
$$;

-- ثالثاً: إضافة القيود بعد تنظيف البيانات
ALTER TABLE public.approved_books 
ADD CONSTRAINT check_non_pdf_url_format 
CHECK (public.validate_non_pdf_url(book_file_url));

ALTER TABLE public.book_submissions 
ADD CONSTRAINT check_non_pdf_url_format 
CHECK (public.validate_non_pdf_url(book_file_url));

-- رابعاً: إنشاء دالة تحديث إعدادات PDF المحسنة
CREATE OR REPLACE FUNCTION public.update_pdf_display_settings_with_validation(
  p_book_id TEXT,
  p_display_mode TEXT DEFAULT 'embed',
  p_config JSONB DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pdf_url TEXT;
BEGIN
  -- جلب رابط الكتاب
  SELECT book_file_url INTO v_pdf_url
  FROM public.approved_books
  WHERE id::text = p_book_id;
  
  -- تحديث إعدادات العرض
  INSERT INTO public.pdf_display_settings (
    book_id, 
    display_mode, 
    viewer_config
  ) VALUES (
    p_book_id, 
    p_display_mode, 
    COALESCE(p_config, '{"toolbar": true, "navpanes": true, "scrollbar": true, "view": "FitH"}')
  )
  ON CONFLICT (book_id) 
  DO UPDATE SET 
    display_mode = p_display_mode,
    viewer_config = COALESCE(p_config, pdf_display_settings.viewer_config),
    updated_at = NOW();
    
  -- تحديث حالة العرض
  UPDATE public.approved_books 
  SET 
    pdf_display_mode = 'embed',
    pdf_status = 'ready'
  WHERE id::text = p_book_id;
END;
$$;
