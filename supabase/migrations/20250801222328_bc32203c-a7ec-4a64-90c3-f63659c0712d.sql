-- تحديث bucket لدعم ملفات txt
UPDATE storage.buckets 
SET 
  allowed_mime_types = ARRAY[
    'application/pdf',
    'text/plain',
    'text/txt',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
WHERE id = 'book-files';

-- تحديث bucket للصور لدعم جميع أنواع الصور
UPDATE storage.buckets 
SET 
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/svg+xml'
  ]
WHERE id = 'book-covers';