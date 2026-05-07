-- إنشاء دالة لإضافة جميع الكتب المعتمدة الموجودة إلى sitemap
CREATE OR REPLACE FUNCTION public.add_existing_books_to_sitemap()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  book_record RECORD;
  books_added INTEGER := 0;
  authors_added INTEGER := 0;
BEGIN
  -- إضافة جميع الكتب المعتمدة
  FOR book_record IN 
    SELECT id, title, author, slug, created_at
    FROM public.book_submissions 
    WHERE status = 'approved'
  LOOP
    -- إضافة رابط الكتاب
    INSERT INTO public.dynamic_sitemap (
      url,
      page_type,
      entity_id,
      priority,
      changefreq,
      lastmod
    ) VALUES (
      'https://kotobi.netlify.app/book/' || COALESCE(book_record.slug, book_record.id::text),
      'book',
      book_record.id,
      0.8,
      'monthly',
      COALESCE(book_record.created_at, NOW())
    ) ON CONFLICT (url) DO UPDATE SET
      lastmod = COALESCE(book_record.created_at, NOW()),
      entity_id = book_record.id;
    
    books_added := books_added + 1;
    
    -- إضافة رابط المؤلف إذا لم يكن موجوداً
    INSERT INTO public.dynamic_sitemap (
      url,
      page_type,
      priority,
      changefreq,
      lastmod
    ) VALUES (
      'https://kotobi.netlify.app/author/' || replace(replace(replace(replace(book_record.author, ' ', '-'), 'أ.', ''), 'د.', ''), '.', ''),
      'author',
      0.7,
      'weekly',
      NOW()
    ) ON CONFLICT (url) DO NOTHING;
    
    -- عد المؤلفين المضافين
    IF NOT EXISTS (
      SELECT 1 FROM public.dynamic_sitemap 
      WHERE url = 'https://kotobi.netlify.app/author/' || replace(replace(replace(replace(book_record.author, ' ', '-'), 'أ.', ''), 'د.', ''), '.', '')
    ) THEN
      authors_added := authors_added + 1;
    END IF;
  END LOOP;
  
  RETURN 'تم إضافة ' || books_added || ' كتاب و ' || authors_added || ' مؤلف إلى sitemap';
END;
$function$;

-- تشغيل الدالة لإضافة الكتب الموجودة
SELECT public.add_existing_books_to_sitemap();