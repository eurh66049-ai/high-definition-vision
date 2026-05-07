-- إنشاء دالة لإضافة الكتب والمؤلفين إلى dynamic_sitemap
CREATE OR REPLACE FUNCTION populate_dynamic_sitemap()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  books_added INTEGER := 0;
  authors_added INTEGER := 0;
  categories_added INTEGER := 0;
BEGIN
  -- حذف الكتب والمؤلفين القدامى أولاً
  DELETE FROM dynamic_sitemap WHERE page_type IN ('book', 'author', 'category');
  
  -- إضافة الكتب المعتمدة
  INSERT INTO dynamic_sitemap (url, page_type, entity_id, priority, changefreq, lastmod)
  SELECT 
    'https://kotobi.netlify.app/book/' || COALESCE(slug, id::text) as url,
    'book' as page_type,
    id as entity_id,
    0.8 as priority,
    'monthly' as changefreq,
    created_at as lastmod
  FROM book_submissions 
  WHERE status = 'approved';
  
  GET DIAGNOSTICS books_added = ROW_COUNT;
  
  -- إضافة المؤلفين
  INSERT INTO dynamic_sitemap (url, page_type, entity_id, priority, changefreq, lastmod)
  SELECT 
    'https://kotobi.netlify.app/author/' || COALESCE(slug, regexp_replace(name, '[^a-zA-Z0-9\u0600-\u06FF\u0750-\u077F]', '-', 'g')) as url,
    'author' as page_type,
    id as entity_id,
    0.7 as priority,
    'weekly' as changefreq,
    created_at as lastmod
  FROM authors;
  
  GET DIAGNOSTICS authors_added = ROW_COUNT;
  
  -- إضافة التصنيفات المختلفة
  INSERT INTO dynamic_sitemap (url, page_type, priority, changefreq, lastmod)
  SELECT DISTINCT
    'https://kotobi.netlify.app/category/' || regexp_replace(category, '[^a-zA-Z0-9\u0600-\u06FF\u0750-\u077F]', '-', 'g') as url,
    'category' as page_type,
    0.6 as priority,
    'weekly' as changefreq,
    NOW() as lastmod
  FROM book_submissions 
  WHERE status = 'approved' AND category IS NOT NULL;
  
  GET DIAGNOSTICS categories_added = ROW_COUNT;
  
  RETURN 'تم إضافة ' || books_added || ' كتاب، ' || authors_added || ' مؤلف، و ' || categories_added || ' تصنيف إلى sitemap';
END;
$$;