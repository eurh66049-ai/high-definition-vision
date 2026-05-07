
-- إنشاء جدول لتخزين معلومات صفحات PDF
CREATE TABLE IF NOT EXISTS public.pdf_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id TEXT NOT NULL,
  page_number INTEGER NOT NULL,
  page_image_url TEXT,
  page_text TEXT,
  page_width INTEGER,
  page_height INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(book_id, page_number)
);

-- إنشاء جدول لتحسين أداء تحميل PDF
CREATE TABLE IF NOT EXISTS public.pdf_metadata (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id TEXT NOT NULL UNIQUE,
  total_pages INTEGER NOT NULL DEFAULT 0,
  file_size BIGINT,
  pdf_version TEXT,
  is_optimized BOOLEAN DEFAULT FALSE,
  optimization_status TEXT DEFAULT 'pending',
  last_processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- تحديث جدول book_cache لإضافة معلومات أكثر
ALTER TABLE public.book_cache 
ADD COLUMN IF NOT EXISTS total_pages INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS optimization_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS error_message TEXT,
ADD COLUMN IF NOT EXISTS last_error_at TIMESTAMP WITH TIME ZONE;

-- إنشاء دالة لتحديث معلومات PDF
CREATE OR REPLACE FUNCTION public.update_pdf_info(
  p_book_id TEXT,
  p_total_pages INTEGER,
  p_file_size BIGINT DEFAULT NULL,
  p_pdf_version TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- تحديث معلومات PDF في جدول pdf_metadata
  INSERT INTO public.pdf_metadata (
    book_id, 
    total_pages, 
    file_size, 
    pdf_version,
    is_optimized,
    last_processed_at
  ) VALUES (
    p_book_id, 
    p_total_pages, 
    p_file_size, 
    p_pdf_version,
    TRUE,
    NOW()
  )
  ON CONFLICT (book_id) 
  DO UPDATE SET 
    total_pages = p_total_pages,
    file_size = COALESCE(p_file_size, pdf_metadata.file_size),
    pdf_version = COALESCE(p_pdf_version, pdf_metadata.pdf_version),
    is_optimized = TRUE,
    last_processed_at = NOW(),
    updated_at = NOW();

  -- تحديث جدول book_cache
  UPDATE public.book_cache 
  SET 
    total_pages = p_total_pages,
    optimization_status = 'completed',
    pdf_status = 'ready',
    last_accessed = NOW()
  WHERE book_id = p_book_id;
END;
$$;

-- إنشاء دالة لإضافة صفحة PDF
CREATE OR REPLACE FUNCTION public.add_pdf_page(
  p_book_id TEXT,
  p_page_number INTEGER,
  p_page_image_url TEXT DEFAULT NULL,
  p_page_text TEXT DEFAULT NULL,
  p_page_width INTEGER DEFAULT NULL,
  p_page_height INTEGER DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_page_id UUID;
BEGIN
  INSERT INTO public.pdf_pages (
    book_id,
    page_number,
    page_image_url,
    page_text,
    page_width,
    page_height
  ) VALUES (
    p_book_id,
    p_page_number,
    p_page_image_url,
    p_page_text,
    p_page_width,
    p_page_height
  )
  ON CONFLICT (book_id, page_number)
  DO UPDATE SET
    page_image_url = COALESCE(p_page_image_url, pdf_pages.page_image_url),
    page_text = COALESCE(p_page_text, pdf_pages.page_text),
    page_width = COALESCE(p_page_width, pdf_pages.page_width),
    page_height = COALESCE(p_page_height, pdf_pages.page_height),
    updated_at = NOW()
  RETURNING id INTO v_page_id;
  
  RETURN v_page_id;
END;
$$;

-- إنشاء دالة للحصول على معلومات PDF المحسنة
CREATE OR REPLACE FUNCTION public.get_enhanced_pdf_info(p_book_id TEXT)
RETURNS TABLE(
  book_id TEXT,
  total_pages INTEGER,
  file_size BIGINT,
  pdf_version TEXT,
  is_optimized BOOLEAN,
  optimization_status TEXT,
  pages_loaded INTEGER,
  cache_status TEXT,
  last_accessed TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pm.book_id,
    pm.total_pages,
    pm.file_size,
    pm.pdf_version,
    pm.is_optimized,
    pm.optimization_status,
    COALESCE((SELECT COUNT(*)::INTEGER FROM public.pdf_pages WHERE pdf_pages.book_id = p_book_id), 0) as pages_loaded,
    COALESCE(bc.pdf_status, 'unknown') as cache_status,
    bc.last_accessed
  FROM public.pdf_metadata pm
  LEFT JOIN public.book_cache bc ON pm.book_id = bc.book_id
  WHERE pm.book_id = p_book_id;
END;
$$;

-- إنشاء دالة لجلب صفحات PDF
CREATE OR REPLACE FUNCTION public.get_pdf_pages(p_book_id TEXT, p_start_page INTEGER DEFAULT 1, p_limit INTEGER DEFAULT 10)
RETURNS TABLE(
  id UUID,
  page_number INTEGER,
  page_image_url TEXT,
  page_text TEXT,
  page_width INTEGER,
  page_height INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pp.id,
    pp.page_number,
    pp.page_image_url,
    pp.page_text,
    pp.page_width,
    pp.page_height
  FROM public.pdf_pages pp
  WHERE pp.book_id = p_book_id
    AND pp.page_number >= p_start_page
    AND pp.page_number < (p_start_page + p_limit)
  ORDER BY pp.page_number ASC;
END;
$$;

-- إنشاء فهرس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_pdf_pages_book_id_page_number ON public.pdf_pages(book_id, page_number);
CREATE INDEX IF NOT EXISTS idx_pdf_metadata_book_id ON public.pdf_metadata(book_id);
CREATE INDEX IF NOT EXISTS idx_book_cache_book_id_status ON public.book_cache(book_id, pdf_status);

-- تفعيل RLS على الجداول الجديدة (مفتوحة للقراءة العامة)
ALTER TABLE public.pdf_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_metadata ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسات RLS للقراءة العامة
CREATE POLICY "Allow public read access to pdf_pages" ON public.pdf_pages FOR SELECT USING (true);
CREATE POLICY "Allow public read access to pdf_metadata" ON public.pdf_metadata FOR SELECT USING (true);
