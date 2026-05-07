
-- إنشاء bucket للصور الشخصية إذا لم يكن موجوداً
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars', 
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

-- حذف السياسات الموجودة للصور الشخصية
DROP POLICY IF EXISTS "Allow authenticated users to upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access to avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own avatar" ON storage.objects;

-- إنشاء سياسات جديدة للصور الشخصية
CREATE POLICY "Allow authenticated users to upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Allow public access to avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Allow users to update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' AND 
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Allow users to delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' AND 
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- تفعيل RLS للملفات الشخصية
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسات RLS للملفات الشخصية إذا لم تكن موجودة
DROP POLICY IF EXISTS "User can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "User can update their own profile" ON public.profiles;

CREATE POLICY "User can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid()::uuid = id);

CREATE POLICY "User can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid()::uuid = id);

-- إنشاء سياسة للسماح للمستخدمين بإنشاء ملفهم الشخصي
CREATE POLICY "User can create their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid()::uuid = id);
