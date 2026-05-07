
-- Add image_url column to site_updates
ALTER TABLE public.site_updates ADD COLUMN image_url TEXT;

-- Create storage bucket for site update images
INSERT INTO storage.buckets (id, name, public) VALUES ('site-updates', 'site-updates', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view site update images
CREATE POLICY "Site update images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'site-updates');

-- Allow authenticated users (admins) to upload
CREATE POLICY "Admins can upload site update images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'site-updates' AND auth.role() = 'authenticated');

-- Allow authenticated users (admins) to delete
CREATE POLICY "Admins can delete site update images"
ON storage.objects FOR DELETE
USING (bucket_id = 'site-updates' AND auth.role() = 'authenticated');
