-- إضافة RLS policy للسماح للنظام بإنشاء meta tags للكتب
CREATE POLICY "System can create meta tags for books" ON public.page_meta_tags
  FOR INSERT 
  WITH CHECK (
    page_type = 'book' AND 
    (auth.role() = 'authenticated' OR auth.role() = 'service_role')
  );

-- إضافة RLS policy للسماح للنظام بتحديث meta tags للكتب  
CREATE POLICY "System can update meta tags for books" ON public.page_meta_tags
  FOR UPDATE 
  USING (
    page_type = 'book' AND 
    (auth.role() = 'authenticated' OR auth.role() = 'service_role')
  );

-- إضافة RLS policy للسماح للنظام بحذف meta tags للكتب
CREATE POLICY "System can delete meta tags for books" ON public.page_meta_tags
  FOR DELETE 
  USING (
    page_type = 'book' AND 
    (auth.role() = 'authenticated' OR auth.role() = 'service_role')
  );