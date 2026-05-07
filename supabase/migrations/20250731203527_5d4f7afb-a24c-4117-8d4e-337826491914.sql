-- إضافة policy للسماح بالإدراج في sitemap_urls
CREATE POLICY "Allow system to insert sitemap urls" ON public.sitemap_urls
    FOR INSERT
    WITH CHECK (true);

-- إضافة policy للسماح بالتحديث في sitemap_urls
CREATE POLICY "Allow system to update sitemap urls" ON public.sitemap_urls
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- إضافة policy للسماح بالحذف في sitemap_urls
CREATE POLICY "Allow system to delete sitemap urls" ON public.sitemap_urls
    FOR DELETE
    USING (true);