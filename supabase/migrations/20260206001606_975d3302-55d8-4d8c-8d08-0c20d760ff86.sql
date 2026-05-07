-- إنشاء bucket للقصص
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'stories',
  'stories',
  true,
  52428800, -- 50MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']
) ON CONFLICT (id) DO NOTHING;

-- سياسات التخزين للقصص
CREATE POLICY "Anyone can view stories media"
ON storage.objects FOR SELECT
USING (bucket_id = 'stories');

CREATE POLICY "Authenticated users can upload stories"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'stories' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own stories media"
ON storage.objects FOR UPDATE
USING (bucket_id = 'stories' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own stories media"
ON storage.objects FOR DELETE
USING (bucket_id = 'stories' AND auth.uid()::text = (storage.foldername(name))[1]);