
-- تحديث سياسات CORS لـ Storage في Supabase
UPDATE storage.buckets 
SET public = true,
    file_size_limit = 104857600,
    allowed_mime_types = ARRAY['application/pdf', 'application/x-pdf', 'application/acrobat', 'applications/vnd.pdf', 'text/pdf', 'text/x-pdf']
WHERE id IN ('book-files', 'book-uploads');

-- إنشاء bucket للكتب إذا لم يكن موجوداً مع إعدادات CORS صحيحة
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'books-pdf',
  'books-pdf',
  true,
  104857600, -- 100MB
  ARRAY['application/pdf', 'application/x-pdf', 'application/acrobat', 'applications/vnd.pdf', 'text/pdf', 'text/x-pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 104857600,
  allowed_mime_types = ARRAY['application/pdf', 'application/x-pdf', 'application/acrobat', 'applications/vnd.pdf', 'text/pdf', 'text/x-pdf'];

-- تحديث السياسات للسماح بالوصول العام للملفات
DROP POLICY IF EXISTS "Allow public access to PDF files" ON storage.objects;
CREATE POLICY "Allow public access to PDF files"
ON storage.objects FOR SELECT
USING (bucket_id IN ('book-files', 'book-uploads', 'books-pdf'));

-- إنشاء دالة لإصلاح روابط PDF وإضافة headers مناسبة
CREATE OR REPLACE FUNCTION public.get_pdf_with_cors_headers(pdf_url text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- التأكد من أن الرابط يحتوي على المعاملات المناسبة للـ CORS
  IF pdf_url LIKE '%supabase.co/storage/v1/object/public/%' THEN
    -- إضافة معاملات CORS إذا لم تكن موجودة
    IF pdf_url NOT LIKE '%download%' THEN
      IF pdf_url LIKE '%?%' THEN
        RETURN pdf_url || '&download=true&cors=true';
      ELSE
        RETURN pdf_url || '?download=true&cors=true';
      END IF;
    END IF;
  END IF;
  
  RETURN pdf_url;
END;
$$;
