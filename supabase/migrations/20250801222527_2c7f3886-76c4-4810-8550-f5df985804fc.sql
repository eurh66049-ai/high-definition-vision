-- إضافة دعم ملفات DOCX إلى bucket الكتب
UPDATE storage.buckets 
SET 
  allowed_mime_types = ARRAY[
    'application/pdf',
    'text/plain',
    'text/txt',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword'
  ]
WHERE id = 'book-files';