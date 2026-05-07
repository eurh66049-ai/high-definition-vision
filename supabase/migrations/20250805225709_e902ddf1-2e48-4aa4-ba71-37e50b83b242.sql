-- إنشاء جدول لإدارة خريطة الموقع الديناميكية
CREATE TABLE IF NOT EXISTS public.dynamic_sitemap (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL UNIQUE,
  lastmod TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  changefreq TEXT DEFAULT 'weekly',
  priority DECIMAL(2,1) DEFAULT 0.5,
  page_type TEXT NOT NULL, -- 'book', 'author', 'category', 'static'
  entity_id UUID, -- ID للكتاب أو المؤلف
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_dynamic_sitemap_page_type ON public.dynamic_sitemap(page_type);
CREATE INDEX IF NOT EXISTS idx_dynamic_sitemap_lastmod ON public.dynamic_sitemap(lastmod);
CREATE INDEX IF NOT EXISTS idx_dynamic_sitemap_entity_id ON public.dynamic_sitemap(entity_id);

-- دالة لتحديث خريطة الموقع تلقائياً عند إضافة كتاب جديد
CREATE OR REPLACE FUNCTION public.update_sitemap_on_book_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- عند الموافقة على كتاب جديد، أضف إلى خريطة الموقع
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    INSERT INTO public.dynamic_sitemap (
      url,
      page_type,
      entity_id,
      priority,
      changefreq
    ) VALUES (
      'https://kotobi.netlify.app/book/' || COALESCE(NEW.slug, NEW.id::text),
      'book',
      NEW.id,
      0.8,
      'monthly'
    ) ON CONFLICT (url) DO UPDATE SET
      lastmod = NOW(),
      updated_at = NOW();
  END IF;
  
  -- عند رفض كتاب، احذفه من خريطة الموقع
  IF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
    DELETE FROM public.dynamic_sitemap 
    WHERE entity_id = NEW.id AND page_type = 'book';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger لتحديث خريطة الموقع
DROP TRIGGER IF EXISTS trigger_update_sitemap_on_book_approval ON public.book_submissions;
CREATE TRIGGER trigger_update_sitemap_on_book_approval
  AFTER UPDATE ON public.book_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_sitemap_on_book_approval();

-- دالة لتحديث خريطة الموقع عند إضافة مؤلف جديد
CREATE OR REPLACE FUNCTION public.update_sitemap_on_author_change()
RETURNS TRIGGER AS $$
BEGIN
  -- عند إضافة مؤلف جديد
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.dynamic_sitemap (
      url,
      page_type,
      entity_id,
      priority,
      changefreq
    ) VALUES (
      'https://kotobi.netlify.app/author/' || COALESCE(NEW.slug, encode(NEW.name::bytea, 'base64')),
      'author',
      NEW.id,
      0.7,
      'weekly'
    ) ON CONFLICT (url) DO UPDATE SET
      lastmod = NOW(),
      updated_at = NOW();
  END IF;
  
  -- عند تحديث slug المؤلف
  IF TG_OP = 'UPDATE' AND OLD.slug IS DISTINCT FROM NEW.slug THEN
    UPDATE public.dynamic_sitemap 
    SET url = 'https://kotobi.netlify.app/author/' || COALESCE(NEW.slug, encode(NEW.name::bytea, 'base64')),
        lastmod = NOW(),
        updated_at = NOW()
    WHERE entity_id = NEW.id AND page_type = 'author';
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger لتحديث خريطة الموقع عند تغيير المؤلفين
DROP TRIGGER IF EXISTS trigger_update_sitemap_on_author_change ON public.authors;
CREATE TRIGGER trigger_update_sitemap_on_author_change
  AFTER INSERT OR UPDATE ON public.authors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_sitemap_on_author_change();

-- جدول لـ canonical URLs لتجنب المحتوى المكرر
CREATE TABLE IF NOT EXISTS public.canonical_urls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_url TEXT NOT NULL,
  canonical_url TEXT NOT NULL,
  page_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(original_url)
);

-- إدراج الصفحات الأساسية في خريطة الموقع
INSERT INTO public.dynamic_sitemap (url, page_type, priority, changefreq) VALUES
  ('https://kotobi.netlify.app/', 'static', 1.0, 'daily'),
  ('https://kotobi.netlify.app/categories', 'static', 0.9, 'weekly'),
  ('https://kotobi.netlify.app/authors', 'static', 0.9, 'weekly'),
  ('https://kotobi.netlify.app/upload-book', 'static', 0.6, 'monthly'),
  ('https://kotobi.netlify.app/about-us', 'static', 0.5, 'monthly'),
  ('https://kotobi.netlify.app/contact-us', 'static', 0.5, 'monthly'),
  ('https://kotobi.netlify.app/privacy-policy', 'static', 0.3, 'yearly'),
  ('https://kotobi.netlify.app/terms-of-service', 'static', 0.3, 'yearly')
ON CONFLICT (url) DO UPDATE SET
  lastmod = NOW(),
  updated_at = NOW();

-- إدراج الكتب المعتمدة الحالية في خريطة الموقع
INSERT INTO public.dynamic_sitemap (url, page_type, entity_id, priority, changefreq)
SELECT 
  'https://kotobi.netlify.app/book/' || COALESCE(slug, id::text),
  'book',
  id,
  0.8,
  'monthly'
FROM public.book_submissions 
WHERE status = 'approved'
ON CONFLICT (url) DO UPDATE SET
  lastmod = NOW(),
  updated_at = NOW();

-- إدراج المؤلفين الحاليين في خريطة الموقع
INSERT INTO public.dynamic_sitemap (url, page_type, entity_id, priority, changefreq)
SELECT 
  'https://kotobi.netlify.app/author/' || COALESCE(slug, encode(name::bytea, 'base64')),
  'author',
  id,
  0.7,
  'weekly'
FROM public.authors
ON CONFLICT (url) DO UPDATE SET
  lastmod = NOW(),
  updated_at = NOW();

-- Enable RLS
ALTER TABLE public.dynamic_sitemap ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canonical_urls ENABLE ROW LEVEL SECURITY;

-- سياسات RLS لخريطة الموقع الديناميكية
CREATE POLICY "Allow public read access to dynamic sitemap" 
ON public.dynamic_sitemap FOR SELECT USING (true);

CREATE POLICY "Allow system to manage dynamic sitemap" 
ON public.dynamic_sitemap FOR ALL USING (true);

-- سياسات RLS للـ canonical URLs
CREATE POLICY "Allow public read access to canonical urls" 
ON public.canonical_urls FOR SELECT USING (true);

CREATE POLICY "Allow system to manage canonical urls" 
ON public.canonical_urls FOR ALL USING (true);