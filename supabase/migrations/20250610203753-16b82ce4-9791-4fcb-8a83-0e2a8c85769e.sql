
-- إزالة جميع التريغرات المعتمدة على الدالة أولاً
DROP TRIGGER IF EXISTS ensure_pdf_extension_approved_books ON public.approved_books CASCADE;
DROP TRIGGER IF EXISTS ensure_pdf_extension_book_submissions ON public.book_submissions CASCADE;
DROP TRIGGER IF EXISTS ensure_pdf_extension_books ON public.books CASCADE;
DROP TRIGGER IF EXISTS ensure_pdf_extension_book_pdfs ON public.book_pdfs CASCADE;

-- الآن حذف الدالة مع CASCADE لضمان إزالة جميع التبعيات
DROP FUNCTION IF EXISTS public.ensure_pdf_extension() CASCADE;

-- تطبيق التحديثات الأساسية
ALTER TABLE public.approved_books DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_display_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_pages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_metadata DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_pages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_cache DISABLE ROW LEVEL SECURITY;

-- تحديث إعدادات عرض PDF للكتب الموجودة
UPDATE public.approved_books 
SET pdf_status = 'ready', 
    pdf_display_mode = 'direct'
WHERE pdf_status IS NULL OR pdf_status = '';

-- إدراج إعدادات PDF افتراضية للكتب التي لا تملك إعدادات
INSERT INTO public.pdf_display_settings (book_id, display_mode, viewer_config, fallback_enabled)
SELECT 
  ab.id::text,
  'embed',
  '{"toolbar": true, "navpanes": true, "scrollbar": true, "view": "FitH"}'::jsonb,
  true
FROM public.approved_books ab
WHERE ab.book_file_url IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM public.pdf_display_settings pds 
    WHERE pds.book_id = ab.id::text
  )
ON CONFLICT (book_id) DO NOTHING;

-- إنشاء دالة محسنة للتحقق من صحة روابط PDF
CREATE OR REPLACE FUNCTION public.validate_pdf_url_format(pdf_url text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- التحقق الأساسي من وجود الرابط
  IF pdf_url IS NULL OR pdf_url = '' THEN
    RETURN false;
  END IF;
  
  -- التحقق من صحة الرابط
  RETURN pdf_url LIKE '%supabase.co/storage/v1/object/public/%'
    AND (lower(pdf_url) LIKE '%.pdf' OR lower(pdf_url) LIKE '%.pdf?%');
END;
$$;

-- إدراج معلومات PDF للكتاب المحدد إذا لم تكن موجودة
DO $$
DECLARE
  target_book_id text := '1381a0d5-f096-4a53-a78a-ae6495c64986';
BEGIN
  -- التأكد من وجود إعدادات عرض PDF للكتاب المحدد
  INSERT INTO public.pdf_display_settings (book_id, display_mode, viewer_config, fallback_enabled)
  VALUES (
    target_book_id,
    'embed',
    '{"toolbar": true, "navpanes": true, "scrollbar": true, "view": "FitH"}'::jsonb,
    true
  )
  ON CONFLICT (book_id) DO UPDATE SET
    display_mode = 'embed',
    viewer_config = '{"toolbar": true, "navpanes": true, "scrollbar": true, "view": "FitH"}'::jsonb,
    fallback_enabled = true,
    updated_at = NOW();
    
  -- تحديث حالة الكتاب المحدد
  UPDATE public.approved_books 
  SET 
    pdf_status = 'ready',
    pdf_display_mode = 'direct'
  WHERE id::text = target_book_id;
END $$;
