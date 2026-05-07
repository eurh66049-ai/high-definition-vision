-- إنشاء دالة لإضافة الكتب والمؤلفين إلى sitemap تلقائياً
CREATE OR REPLACE FUNCTION public.add_book_to_sitemap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
    
    -- إضافة رابط المؤلف إذا لم يكن موجوداً
    INSERT INTO public.dynamic_sitemap (
      url,
      page_type,
      priority,
      changefreq,
      lastmod
    ) 
    SELECT 
      'https://kotobi.netlify.app/author/' || encodeURIComponent(NEW.author),
      'author',
      0.7,
      'weekly',
      NOW()
    WHERE NOT EXISTS (
      SELECT 1 FROM public.dynamic_sitemap 
      WHERE url = 'https://kotobi.netlify.app/author/' || encodeURIComponent(NEW.author)
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- إنشاء trigger يعمل عند إدراج أو تحديث الكتب
DROP TRIGGER IF EXISTS book_sitemap_trigger ON public.book_submissions;
CREATE TRIGGER book_sitemap_trigger
  AFTER INSERT OR UPDATE ON public.book_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.add_book_to_sitemap();