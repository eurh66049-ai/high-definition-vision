-- Update database triggers to use new domain kotobi.xyz

-- Update the trigger function for book submissions to sitemap
CREATE OR REPLACE FUNCTION public.add_book_to_sitemap()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' THEN
    INSERT INTO public.dynamic_sitemap (url, page_type, entity_id, priority, changefreq)
    VALUES (
      'https://kotobi.xyz/book/' || COALESCE(NEW.slug, NEW.id::text),
      'book',
      NEW.id,
      0.8,
      'weekly'
    )
    ON CONFLICT (url) DO UPDATE SET
      lastmod = NOW(),
      updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update the trigger function for authors to sitemap
CREATE OR REPLACE FUNCTION public.add_author_to_sitemap()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.dynamic_sitemap (url, page_type, entity_id, priority, changefreq)
  VALUES (
    'https://kotobi.xyz/author/' || COALESCE(NEW.slug, encode(NEW.name::bytea, 'base64')),
    'author',
    NEW.id,
    0.7,
    'monthly'
  )
  ON CONFLICT (url) DO UPDATE SET
    lastmod = NOW(),
    updated_at = NOW();

  IF TG_OP = 'UPDATE' AND OLD.slug IS DISTINCT FROM NEW.slug THEN
    UPDATE public.dynamic_sitemap 
    SET url = 'https://kotobi.xyz/author/' || COALESCE(NEW.slug, encode(NEW.name::bytea, 'base64')),
        lastmod = NOW(),
        updated_at = NOW()
    WHERE entity_id = NEW.id AND page_type = 'author';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update remaining old domain URLs in dynamic_sitemap
UPDATE public.dynamic_sitemap 
SET url = REPLACE(url, 'https://kotobi.netlify.app', 'https://kotobi.xyz'),
    updated_at = NOW()
WHERE url LIKE '%kotobi.netlify.app%';

-- Update remaining old domain URLs in sitemap_urls
UPDATE public.sitemap_urls 
SET url = REPLACE(url, 'https://kotobi.netlify.app', 'https://kotobi.xyz')
WHERE url LIKE '%kotobi.netlify.app%';
