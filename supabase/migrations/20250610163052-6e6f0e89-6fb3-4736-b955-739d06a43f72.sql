
-- إنشاء جدول لتخزين إعدادات عرض PDF
CREATE TABLE IF NOT EXISTS public.pdf_display_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id TEXT NOT NULL UNIQUE,
  display_mode TEXT DEFAULT 'embed',
  viewer_config JSONB DEFAULT '{"toolbar": true, "navpanes": true, "scrollbar": true}',
  fallback_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- تحديث جدول approved_books لإضافة معلومات PDF
ALTER TABLE public.approved_books 
ADD COLUMN IF NOT EXISTS pdf_display_mode TEXT DEFAULT 'direct',
ADD COLUMN IF NOT EXISTS pdf_viewer_settings JSONB DEFAULT '{"embed": true, "iframe": true, "download": true}',
ADD COLUMN IF NOT EXISTS pdf_status TEXT DEFAULT 'ready';

-- إنشاء دالة لتحديث إعدادات عرض PDF
CREATE OR REPLACE FUNCTION public.update_pdf_display_settings(
  p_book_id TEXT,
  p_display_mode TEXT DEFAULT 'embed',
  p_config JSONB DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.pdf_display_settings (
    book_id, 
    display_mode, 
    viewer_config
  ) VALUES (
    p_book_id, 
    p_display_mode, 
    COALESCE(p_config, '{"toolbar": true, "navpanes": true, "scrollbar": true}')
  )
  ON CONFLICT (book_id) 
  DO UPDATE SET 
    display_mode = p_display_mode,
    viewer_config = COALESCE(p_config, pdf_display_settings.viewer_config),
    updated_at = NOW();
    
  -- تحديث حالة PDF في جدول approved_books
  UPDATE public.approved_books 
  SET 
    pdf_display_mode = 'direct',
    pdf_status = 'ready'
  WHERE id::text = p_book_id;
END;
$$;

-- إنشاء دالة للحصول على إعدادات عرض PDF
CREATE OR REPLACE FUNCTION public.get_pdf_display_info(p_book_id TEXT)
RETURNS TABLE(
  book_id TEXT,
  display_mode TEXT,
  viewer_config JSONB,
  book_file_url TEXT,
  pdf_status TEXT,
  fallback_enabled BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pds.book_id,
    pds.display_mode,
    pds.viewer_config,
    ab.book_file_url,
    COALESCE(ab.pdf_status, 'ready') as pdf_status,
    pds.fallback_enabled
  FROM public.pdf_display_settings pds
  LEFT JOIN public.approved_books ab ON pds.book_id = ab.id::text
  WHERE pds.book_id = p_book_id;
END;
$$;

-- تفعيل RLS على الجدول الجديد
ALTER TABLE public.pdf_display_settings ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسة RLS للقراءة العامة
CREATE POLICY "Allow public read access to pdf_display_settings" 
ON public.pdf_display_settings FOR SELECT USING (true);

-- تحديث إعدادات PDF للكتب الموجودة
INSERT INTO public.pdf_display_settings (book_id, display_mode, viewer_config)
SELECT 
  id::text,
  'embed',
  '{"toolbar": true, "navpanes": true, "scrollbar": true, "view": "FitH"}'
FROM public.approved_books 
WHERE book_file_url IS NOT NULL
ON CONFLICT (book_id) DO NOTHING;
