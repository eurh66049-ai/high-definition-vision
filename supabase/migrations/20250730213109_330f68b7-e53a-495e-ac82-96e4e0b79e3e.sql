-- إنشاء جدول لتخزين meta tags للصفحات
CREATE TABLE IF NOT EXISTS public.page_meta_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page_type TEXT NOT NULL, -- 'book', 'author', 'category'
  page_identifier TEXT NOT NULL, -- book slug, author slug, category name
  title TEXT NOT NULL,
  description TEXT,
  keywords TEXT,
  og_image TEXT,
  canonical_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(page_type, page_identifier)
);

-- إنشاء جدول للـ sitemap
CREATE TABLE IF NOT EXISTS public.sitemap_urls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  page_type TEXT NOT NULL,
  priority DECIMAL(2,1) DEFAULT 0.5,
  changefreq TEXT DEFAULT 'weekly', -- always, hourly, daily, weekly, monthly, yearly, never
  lastmod TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- تمكين RLS
ALTER TABLE public.page_meta_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sitemap_urls ENABLE ROW LEVEL SECURITY;

-- سياسات للقراءة العامة (للـ SEO)
CREATE POLICY "Allow public read access to meta tags" ON public.page_meta_tags FOR SELECT USING (true);
CREATE POLICY "Allow public read access to sitemap" ON public.sitemap_urls FOR SELECT USING (true);

-- دالة لتحديث meta tags للكتب
CREATE OR REPLACE FUNCTION public.generate_book_meta_tags()
RETURNS TRIGGER AS $$
BEGIN
  -- فقط للكتب المعتمدة
  IF NEW.status = 'approved' THEN
    -- حذف meta tags القديمة إن وجدت
    DELETE FROM public.page_meta_tags 
    WHERE page_type = 'book' AND page_identifier = NEW.slug;
    
    -- إنشاء meta tags جديدة
    INSERT INTO public.page_meta_tags (
      page_type,
      page_identifier,
      title,
      description,
      keywords,
      og_image,
      canonical_url
    ) VALUES (
      'book',
      NEW.slug,
      NEW.title || ' - ' || NEW.author || ' | كتبي',
      COALESCE(
        LEFT(NEW.description, 160),
        'اقرأ كتاب "' || NEW.title || '" للمؤلف ' || NEW.author || ' مجاناً على منصة كتبي'
      ),
      NEW.category || ', ' || NEW.author || ', كتب عربية, قراءة مجانية',
      NEW.cover_image_url,
      'https://kotobi.netlify.app/book/' || NEW.slug
    );
    
    -- إضافة/تحديث URL في الـ sitemap
    INSERT INTO public.sitemap_urls (url, page_type, priority, changefreq)
    VALUES (
      'https://kotobi.netlify.app/book/' || NEW.slug,
      'book',
      0.8,
      'monthly'
    )
    ON CONFLICT (url) DO UPDATE SET
      lastmod = NOW(),
      priority = 0.8;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger للكتب
DROP TRIGGER IF EXISTS trigger_book_meta_tags ON public.book_submissions;
CREATE TRIGGER trigger_book_meta_tags
  AFTER INSERT OR UPDATE ON public.book_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_book_meta_tags();

-- دالة لتحديث meta tags للمؤلفين
CREATE OR REPLACE FUNCTION public.generate_author_meta_tags()
RETURNS TRIGGER AS $$
BEGIN
  -- حذف meta tags القديمة إن وجدت
  DELETE FROM public.page_meta_tags 
  WHERE page_type = 'author' AND page_identifier = NEW.slug;
  
  -- إنشاء meta tags جديدة
  INSERT INTO public.page_meta_tags (
    page_type,
    page_identifier,
    title,
    description,
    keywords,
    og_image,
    canonical_url
  ) VALUES (
    'author',
    NEW.slug,
    'المؤلف ' || NEW.name || ' | كتبي',
    COALESCE(
      LEFT(NEW.bio, 160),
      'تصفح جميع كتب المؤلف ' || NEW.name || ' على منصة كتبي - مكتبة الكتب العربية المجانية'
    ),
    NEW.name || ', مؤلف عربي, كتب عربية, كتبي',
    NEW.avatar_url,
    'https://kotobi.netlify.app/author/' || NEW.slug
  );
  
  -- إضافة/تحديث URL في الـ sitemap
  INSERT INTO public.sitemap_urls (url, page_type, priority, changefreq)
  VALUES (
    'https://kotobi.netlify.app/author/' || NEW.slug,
    'author',
    0.7,
    'weekly'
  )
  ON CONFLICT (url) DO UPDATE SET
    lastmod = NOW(),
    priority = 0.7;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger للمؤلفين
DROP TRIGGER IF EXISTS trigger_author_meta_tags ON public.authors;
CREATE TRIGGER trigger_author_meta_tags
  AFTER INSERT OR UPDATE ON public.authors
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_author_meta_tags();

-- إنشاء meta tags للصفحات الحالية
INSERT INTO public.page_meta_tags (page_type, page_identifier, title, description, canonical_url) VALUES
('home', 'index', 'كتبي - المكتبة الرقمية العربية المجانية', 'اكتشف آلاف الكتب العربية المجانية في جميع المجالات - روايات، تطوير ذات، علوم، وأكثر', 'https://kotobi.netlify.app/'),
('categories', 'index', 'تصنيفات الكتب | كتبي', 'تصفح الكتب حسب التصنيف - أدب، علوم، تطوير ذات، تاريخ، فلسفة وأكثر', 'https://kotobi.netlify.app/categories'),
('authors', 'index', 'المؤلفون العرب | كتبي', 'تصفح كتب أشهر المؤلفين العرب والمعاصرين', 'https://kotobi.netlify.app/authors');

-- إضافة الصفحات الأساسية للـ sitemap
INSERT INTO public.sitemap_urls (url, page_type, priority, changefreq) VALUES
('https://kotobi.netlify.app/', 'home', 1.0, 'daily'),
('https://kotobi.netlify.app/categories', 'categories', 0.9, 'weekly'),
('https://kotobi.netlify.app/authors', 'authors', 0.9, 'weekly'),
('https://kotobi.netlify.app/upload-book', 'upload', 0.6, 'monthly'),
('https://kotobi.netlify.app/about', 'about', 0.5, 'yearly');