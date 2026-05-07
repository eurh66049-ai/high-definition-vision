
-- إضافة الأعمدة المفقودة في جدول book_submissions
ALTER TABLE public.book_submissions 
ADD COLUMN IF NOT EXISTS publisher text,
ADD COLUMN IF NOT EXISTS translator text;

-- تحديث Edge Function للحصول على طلبات الكتب
CREATE OR REPLACE FUNCTION get_book_submissions_data(status_filter text)
RETURNS TABLE(
  id uuid,
  title text,
  subtitle text,
  author text,
  category text,
  publisher text,
  translator text,
  description text,
  language text,
  publication_year integer,
  page_count integer,
  cover_image_url text,
  book_file_url text,
  file_type text,
  display_type text,
  rights_confirmation boolean,
  created_at timestamp with time zone,
  status text,
  user_id uuid,
  user_email text,
  reviewer_notes text,
  reviewed_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bs.id,
    bs.title,
    bs.subtitle,
    bs.author,
    bs.category,
    bs.publisher,
    bs.translator,
    bs.description,
    bs.language,
    bs.publication_year,
    bs.page_count,
    bs.cover_image_url,
    bs.book_file_url,
    bs.file_type,
    bs.display_type,
    bs.rights_confirmation,
    bs.created_at,
    bs.status,
    bs.user_id,
    bs.user_email,
    bs.reviewer_notes,
    bs.reviewed_at
  FROM public.book_submissions bs
  WHERE bs.status = status_filter
  ORDER BY bs.created_at DESC;
END;
$$;

-- إنشاء storage bucket إذا لم يكن موجود
INSERT INTO storage.buckets (id, name, public)
VALUES ('book-uploads', 'book-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- إنشاء سياسات Storage للسماح برفع الملفات
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'book-uploads');

CREATE POLICY "Allow public read access" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'book-uploads');

CREATE POLICY "Allow authenticated delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'book-uploads');
