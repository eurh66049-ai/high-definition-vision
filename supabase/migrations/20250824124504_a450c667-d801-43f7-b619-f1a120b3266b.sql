-- إصلاح دالة sitemap التي تسبب خطأ encodeuricomponent

-- حذف trigger أولاً
DROP TRIGGER IF EXISTS book_sitemap_trigger ON public.book_submissions;

-- حذف الدالة المعطلة
DROP FUNCTION IF EXISTS add_book_to_sitemap();

-- إنشاء دالة محسنة بدون استخدام encodeURIComponent
CREATE OR REPLACE FUNCTION public.add_book_to_sitemap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  author_slug text;
BEGIN
  -- إضافة الكتاب إلى sitemap إذا كان معتمد
  IF NEW.status = 'approved' THEN
    -- إضافة رابط الكتاب
    INSERT INTO public.dynamic_sitemap (
      url,
      page_type,
      entity_id,
      priority,
      changefreq,
      lastmod
    ) VALUES (
      'https://kotobi.netlify.app/book/' || COALESCE(NEW.slug, NEW.id::text),
      'book',
      NEW.id,
      0.8,
      'monthly',
      NOW()
    ) ON CONFLICT (url) DO UPDATE SET
      lastmod = NOW(),
      entity_id = NEW.id;
    
    -- إنشاء slug للمؤلف بدلاً من encodeURIComponent
    author_slug := replace(replace(replace(replace(LOWER(NEW.author), ' ', '-'), 'أ.', ''), 'د.', ''), '.', '');
    
    -- إضافة رابط المؤلف إذا لم يكن موجوداً
    INSERT INTO public.dynamic_sitemap (
      url,
      page_type,
      priority,
      changefreq,
      lastmod
    ) VALUES (
      'https://kotobi.netlify.app/author/' || author_slug,
      'author',
      0.7,
      'weekly',
      NOW()
    ) ON CONFLICT (url) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- إعادة إنشاء trigger
CREATE TRIGGER book_sitemap_trigger
  AFTER INSERT OR UPDATE ON public.book_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.add_book_to_sitemap();