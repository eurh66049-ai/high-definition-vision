-- تحديث جميع روابط خريطة الموقع من النطاق القديم إلى الجديد
UPDATE public.dynamic_sitemap 
SET url = REPLACE(url, 'https://kotobi.netlify.app', 'https://kotobi.xyz'),
    updated_at = NOW()
WHERE url LIKE '%kotobi.netlify.app%';

-- تحديث جدول sitemap_urls أيضاً
UPDATE public.sitemap_urls 
SET url = REPLACE(url, 'https://kotobi.netlify.app', 'https://kotobi.xyz')
WHERE url LIKE '%kotobi.netlify.app%';