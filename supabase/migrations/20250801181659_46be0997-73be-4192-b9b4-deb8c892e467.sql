-- تحديث سياسات RLS لجدول verified_authors لتمكين المدراء من الوصول
DROP POLICY IF EXISTS "Admins can manage verified authors" ON public.verified_authors;
DROP POLICY IF EXISTS "Anyone can view verified authors" ON public.verified_authors;

-- سياسة للعرض - يمكن لأي شخص رؤية المؤلفين الموثقين
CREATE POLICY "Anyone can view verified authors" 
ON public.verified_authors
FOR SELECT 
USING (true);

-- سياسة للإدراج والتحديث - المدراء فقط
CREATE POLICY "Admins can insert verified authors" 
ON public.verified_authors
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Admins can update verified authors" 
ON public.verified_authors
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Admins can delete verified authors" 
ON public.verified_authors
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- إعطاء صلاحيات تنفيذ الدوال للمستخدمين المسجلين
GRANT EXECUTE ON FUNCTION public.verify_author(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unverify_author(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_author_verified(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_author_verified_by_name(TEXT) TO authenticated;