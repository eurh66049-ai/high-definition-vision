
-- تحديث إعدادات bucket لزيادة حد رفع الملفات
UPDATE storage.buckets 
SET 
  file_size_limit = 104857600, -- 100MB في bytes
  allowed_mime_types = ARRAY['application/pdf', 'application/x-pdf', 'application/acrobat', 'applications/vnd.pdf', 'text/pdf', 'text/x-pdf']
WHERE id = 'book-uploads';

-- إنشاء bucket للكتب إذا لم يكن موجوداً
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'book-files',
  'book-files',
  true,
  104857600, -- 100MB
  ARRAY['application/pdf', 'application/x-pdf', 'application/acrobat', 'applications/vnd.pdf', 'text/pdf', 'text/x-pdf']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 104857600,
  allowed_mime_types = ARRAY['application/pdf', 'application/x-pdf', 'application/acrobat', 'applications/vnd.pdf', 'text/pdf', 'text/x-pdf'];

-- إنشاء bucket لصور الأغلفة
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'book-covers',
  'book-covers',
  true,
  10485760, -- 10MB للصور
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

-- إنشاء bucket لصور المؤلفين
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'author-images',
  'author-images',
  true,
  5242880, -- 5MB للصور
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

-- حذف السياسات الموجودة إذا كانت موجودة
DROP POLICY IF EXISTS "Allow authenticated users to upload book files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access to book files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload cover images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access to cover images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload author images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access to author images" ON storage.objects;

-- إنشاء السياسات الجديدة
CREATE POLICY "Allow authenticated users to upload book files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'book-files' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Allow public access to book files"
ON storage.objects FOR SELECT
USING (bucket_id = 'book-files');

CREATE POLICY "Allow authenticated users to upload cover images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'book-covers' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Allow public access to cover images"
ON storage.objects FOR SELECT
USING (bucket_id = 'book-covers');

CREATE POLICY "Allow authenticated users to upload author images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'author-images' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Allow public access to author images"
ON storage.objects FOR SELECT
USING (bucket_id = 'author-images');

-- تحديث حقل processing_status في جدول book_submissions لتتبع حالة الرفع بشكل أفضل
ALTER TABLE public.book_submissions 
ADD COLUMN IF NOT EXISTS upload_progress integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS upload_status text DEFAULT 'not_started',
ADD COLUMN IF NOT EXISTS upload_error_message text DEFAULT NULL;
