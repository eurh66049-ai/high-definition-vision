
-- Drop old policies and recreate with proper auth check
DROP POLICY IF EXISTS "Admins can upload site update images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete site update images" ON storage.objects;

-- Recreate with auth.uid() check instead of auth.role()
CREATE POLICY "Admins can upload site update images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'site-updates' AND auth.uid() IS NOT NULL);

-- Also add UPDATE policy (needed for overwriting files)
CREATE POLICY "Admins can update site update images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'site-updates' AND auth.uid() IS NOT NULL);

-- Recreate delete policy
CREATE POLICY "Admins can delete site update images"
ON storage.objects FOR DELETE
USING (bucket_id = 'site-updates' AND auth.uid() IS NOT NULL);
