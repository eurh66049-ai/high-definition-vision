
-- المرحلة الأولى: إنشاء جداول موحدة وتنظيف التكرار

-- 1. إنشاء جدول موحد للمؤلفين إذا لم يكن موجوداً
-- (جدول authors موجود بالفعل، سنحسن هيكله)
ALTER TABLE public.authors 
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS books_count integer DEFAULT 0;

-- 2. إنشاء جدول موحد للملفات
CREATE TABLE IF NOT EXISTS public.media_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_type text NOT NULL CHECK (file_type IN ('cover_image', 'book_pdf', 'author_image')),
  file_url text NOT NULL,
  file_size bigint,
  mime_type text,
  original_filename text,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 3. إضافة فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_media_files_type ON public.media_files(file_type);
CREATE INDEX IF NOT EXISTS idx_media_files_url ON public.media_files(file_url);

-- 4. إنشاء جدول ربط بين الكتب والملفات
CREATE TABLE IF NOT EXISTS public.book_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid,
  book_table text NOT NULL CHECK (book_table IN ('books', 'approved_books', 'book_submissions')),
  media_file_id uuid REFERENCES public.media_files(id) ON DELETE CASCADE,
  media_type text NOT NULL CHECK (media_type IN ('cover', 'pdf', 'thumbnail')),
  created_at timestamp with time zone DEFAULT now()
);

-- 5. إضافة فهارس لجدول book_media
CREATE INDEX IF NOT EXISTS idx_book_media_book ON public.book_media(book_id, book_table);
CREATE INDEX IF NOT EXISTS idx_book_media_type ON public.book_media(media_type);

-- 6. دمج جداول معالجة PDF المكررة
-- إزالة الجداول المكررة تدريجياً
DROP TABLE IF EXISTS public.pdf_page_images;

-- 7. تحسين جدول pdf_pages ليكون الجدول الوحيد لصفحات PDF
ALTER TABLE public.pdf_pages 
ADD COLUMN IF NOT EXISTS file_size bigint,
ADD COLUMN IF NOT EXISTS image_quality integer DEFAULT 100,
ADD COLUMN IF NOT EXISTS processing_status text DEFAULT 'completed';

-- 8. إنشاء دالة لمزامنة بيانات المؤلفين
CREATE OR REPLACE FUNCTION public.sync_author_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- مزامنة المؤلفين من approved_books إلى authors
  INSERT INTO public.authors (name, bio, avatar_url)
  SELECT DISTINCT 
    ab.author,
    ab.author_bio,
    ab.author_image_url
  FROM public.approved_books ab
  WHERE ab.author IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.authors a 
      WHERE LOWER(TRIM(a.name)) = LOWER(TRIM(ab.author))
    )
  ON CONFLICT DO NOTHING;
  
  -- تحديث عدد الكتب لكل مؤلف
  UPDATE public.authors 
  SET books_count = (
    SELECT COUNT(*) 
    FROM public.approved_books ab 
    WHERE LOWER(TRIM(ab.author)) = LOWER(TRIM(authors.name))
  );
END;
$$;

-- 9. تشغيل دالة المزامنة
SELECT public.sync_author_data();

-- 10. إنشاء دالة لتنظيف الملفات المكررة
CREATE OR REPLACE FUNCTION public.migrate_media_files()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- نقل صور الأغلفة من approved_books
  INSERT INTO public.media_files (file_type, file_url, metadata)
  SELECT DISTINCT 
    'cover_image',
    cover_image_url,
    jsonb_build_object('source_table', 'approved_books', 'book_id', id)
  FROM public.approved_books 
  WHERE cover_image_url IS NOT NULL 
    AND cover_image_url != ''
    AND NOT EXISTS (
      SELECT 1 FROM public.media_files mf 
      WHERE mf.file_url = approved_books.cover_image_url
    );
  
  -- نقل ملفات PDF من approved_books
  INSERT INTO public.media_files (file_type, file_url, metadata)
  SELECT DISTINCT 
    'book_pdf',
    book_file_url,
    jsonb_build_object('source_table', 'approved_books', 'book_id', id)
  FROM public.approved_books 
  WHERE book_file_url IS NOT NULL 
    AND book_file_url != ''
    AND NOT EXISTS (
      SELECT 1 FROM public.media_files mf 
      WHERE mf.file_url = approved_books.book_file_url
    );
    
  -- نقل صور المؤلفين من approved_books
  INSERT INTO public.media_files (file_type, file_url, metadata)
  SELECT DISTINCT 
    'author_image',
    author_image_url,
    jsonb_build_object('source_table', 'approved_books', 'author_name', author)
  FROM public.approved_books 
  WHERE author_image_url IS NOT NULL 
    AND author_image_url != ''
    AND NOT EXISTS (
      SELECT 1 FROM public.media_files mf 
      WHERE mf.file_url = approved_books.author_image_url
    );
END;
$$;

-- 11. تشغيل دالة نقل الملفات
SELECT public.migrate_media_files();

-- 12. إنشاء RLS policies للجداول الجديدة
ALTER TABLE public.media_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_media ENABLE ROW LEVEL SECURITY;

-- السماح بالقراءة العامة للملفات
CREATE POLICY "Allow public read access to media files" 
ON public.media_files FOR SELECT 
USING (true);

CREATE POLICY "Allow public read access to book media" 
ON public.book_media FOR SELECT 
USING (true);

-- 13. إنشاء دالة للحصول على ملفات الكتاب
CREATE OR REPLACE FUNCTION public.get_book_media(
  p_book_id uuid,
  p_book_table text DEFAULT 'approved_books'
)
RETURNS TABLE(
  media_type text,
  file_url text,
  file_size bigint,
  metadata jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bm.media_type,
    mf.file_url,
    mf.file_size,
    mf.metadata
  FROM public.book_media bm
  JOIN public.media_files mf ON bm.media_file_id = mf.id
  WHERE bm.book_id = p_book_id 
    AND bm.book_table = p_book_table;
END;
$$;

-- 14. تنظيف البيانات القديمة المكررة في pdf_metadata
DELETE FROM public.pdf_metadata 
WHERE id NOT IN (
  SELECT DISTINCT ON (book_id) id 
  FROM public.pdf_metadata 
  ORDER BY book_id, created_at DESC
);

-- 15. تنظيف البيانات المكررة في book_cache
DELETE FROM public.book_cache 
WHERE id NOT IN (
  SELECT DISTINCT ON (book_id) id 
  FROM public.book_cache 
  ORDER BY book_id, last_accessed DESC
);
