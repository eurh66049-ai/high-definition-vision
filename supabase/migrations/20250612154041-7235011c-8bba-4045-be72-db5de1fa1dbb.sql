
-- إنشاء دالة محسنة لجلب الكتب المعتمدة مع معالجة أفضل للصور
CREATE OR REPLACE FUNCTION public.get_books_with_optimized_images()
RETURNS TABLE(
  id text,
  title text,
  author text,
  category text,
  description text,
  cover_image text,
  book_type text,
  views integer,
  rating numeric,
  is_free boolean,
  created_at timestamp with time zone,
  cover_image_url text,
  optimized_cover_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ab.id::text,
    ab.title,
    ab.author,
    ab.category,
    ab.description,
    ab.cover_image_url as cover_image,
    'uploaded'::text as book_type,
    ab.views,
    ab.rating,
    true as is_free,
    ab.created_at,
    ab.cover_image_url,
    -- إنشاء رابط محسن للصورة مع معاملات للتحسين
    CASE 
      WHEN ab.cover_image_url IS NOT NULL AND ab.cover_image_url != '' THEN
        ab.cover_image_url || '?width=400&height=600&quality=80&format=webp'
      ELSE
        '/placeholder.svg'
    END as optimized_cover_url
  FROM public.approved_books ab
  WHERE ab.is_active = true
  ORDER BY ab.created_at DESC;
END;
$$;

-- إنشاء دالة لتحديث معلومات صور الكتب
CREATE OR REPLACE FUNCTION public.update_book_cover_metadata(
  p_book_id uuid,
  p_cover_width integer DEFAULT NULL,
  p_cover_height integer DEFAULT NULL,
  p_cover_format text DEFAULT NULL,
  p_cover_size bigint DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- تحديث معلومات الصورة في جدول approved_books
  UPDATE public.approved_books 
  SET 
    cover_metadata = jsonb_build_object(
      'width', COALESCE(p_cover_width, (cover_metadata->>'width')::integer),
      'height', COALESCE(p_cover_height, (cover_metadata->>'height')::integer),
      'format', COALESCE(p_cover_format, cover_metadata->>'format'),
      'size', COALESCE(p_cover_size, (cover_metadata->>'size')::bigint),
      'optimized', true,
      'last_updated', extract(epoch from now())
    )
  WHERE id = p_book_id;
END;
$$;

-- إضافة عمود لحفظ معلومات الصورة إذا لم يكن موجوداً
ALTER TABLE public.approved_books 
ADD COLUMN IF NOT EXISTS cover_metadata jsonb DEFAULT '{}';

-- إنشاء دالة للتحقق من صحة روابط الصور (مصححة)
CREATE OR REPLACE FUNCTION public.validate_and_fix_image_urls()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  fixed_count integer := 0;
  temp_count integer;
BEGIN
  -- إصلاح الروابط المكسورة أو الفارغة
  UPDATE public.approved_books 
  SET cover_image_url = '/placeholder.svg'
  WHERE cover_image_url IS NULL 
     OR cover_image_url = '' 
     OR cover_image_url = 'undefined'
     OR cover_image_url = 'null';
  
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  fixed_count := fixed_count + temp_count;
  
  -- تحديث الكتب التي تحتوي على روابط archive.org
  UPDATE public.approved_books 
  SET cover_image_url = '/placeholder.svg'
  WHERE cover_image_url LIKE '%archive.org%' 
     OR cover_image_url LIKE '%BookReader%';
  
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  fixed_count := fixed_count + temp_count;
  
  RETURN fixed_count;
END;
$$;

-- إنشاء فهارس لتحسين أداء جلب الصور
CREATE INDEX IF NOT EXISTS idx_approved_books_cover_image ON public.approved_books(cover_image_url) WHERE cover_image_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_approved_books_active_created ON public.approved_books(is_active, created_at DESC) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_book_submissions_cover_image ON public.book_submissions(cover_image_url) WHERE cover_image_url IS NOT NULL;

-- تشغيل دالة الإصلاح مرة واحدة
SELECT public.validate_and_fix_image_urls();
