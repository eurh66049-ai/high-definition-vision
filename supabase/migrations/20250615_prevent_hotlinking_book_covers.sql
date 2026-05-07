
-- تحديث إعدادات CORS
UPDATE storage.buckets 
SET cors = '["https://kotobi.netlify.app"]', -- عدل حسب نطاقك
    public = false
WHERE id = 'book-covers';

-- حذف السياسة العامة الحالية (إن وجدت)
DROP POLICY IF EXISTS "Allow public access to book covers" ON storage.objects;

-- إنشاء سياسة جديدة تمنع كل الطلبات إلا إذا كان Origin هو نطاق موقعك فقط
CREATE POLICY "Allow image access only from kotobi.netlify.app"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'book-covers'
  AND (
    coalesce(request.headers ->> 'origin', '') = 'https://kotobi.netlify.app'
    OR coalesce(request.headers ->> 'Referer', '') LIKE 'https://kotobi.netlify.app%'
  )
);
