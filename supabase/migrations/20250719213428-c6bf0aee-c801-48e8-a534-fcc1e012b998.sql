-- إنشاء سياسات صحيحة لرفع الملفات في book-covers و book-files
-- حذف السياسات المكررة والخطأ أولاً

-- إنشاء سياسات موحدة وصحيحة لـ book-covers
DROP POLICY IF EXISTS "book_covers_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "book_covers_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "book_covers_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "book_covers_delete_policy" ON storage.objects;

-- إنشاء سياسات موحدة وصحيحة لـ book-files
DROP POLICY IF EXISTS "book_files_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "book_files_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "book_files_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "book_files_delete_policy" ON storage.objects;

-- سياسات جديدة محسنة لـ book-covers
CREATE POLICY "Allow authenticated users to upload to book-covers"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'book-covers');

CREATE POLICY "Allow public read access to book-covers"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'book-covers');

CREATE POLICY "Allow authenticated users to update book-covers"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'book-covers')
WITH CHECK (bucket_id = 'book-covers');

CREATE POLICY "Allow authenticated users to delete from book-covers"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'book-covers');

-- سياسات جديدة محسنة لـ book-files
CREATE POLICY "Allow authenticated users to upload to book-files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'book-files');

CREATE POLICY "Allow public read access to book-files"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'book-files');

CREATE POLICY "Allow authenticated users to update book-files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'book-files')
WITH CHECK (bucket_id = 'book-files');

CREATE POLICY "Allow authenticated users to delete from book-files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'book-files');