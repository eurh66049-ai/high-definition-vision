-- إنشاء دالة آمنة للتحقق من صلاحيات المدير لحل مشكلة التكرار اللا نهائي
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.admin_users 
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND is_active = true
  );
$$;

-- إنشاء دالة للحصول على دور المستخدم الحالي
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid()) 
      AND is_active = true
    ) THEN 'admin'
    ELSE 'user'
  END;
$$;

-- حذف السياسات القديمة من admin_users لتجنب التكرار اللا نهائي
DROP POLICY IF EXISTS "Admin users can manage admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "Only admins can view admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "Only admins can manage admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "Admins can view admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Admins can manage admin users" ON public.admin_users;

-- إنشاء سياسات جديدة آمنة لجدول admin_users
CREATE POLICY "Admin users can view themselves" 
ON public.admin_users 
FOR SELECT 
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Admin users can update themselves" 
ON public.admin_users 
FOR UPDATE 
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- تحديث سياسة approved_books لاستخدام الدالة الآمنة
DROP POLICY IF EXISTS "Admins can manage books" ON public.approved_books;
CREATE POLICY "Admins can manage books" 
ON public.approved_books 
FOR ALL 
USING (public.is_current_user_admin());

-- تحديث سياسات admin_book_batches لاستخدام الدالة الآمنة
DROP POLICY IF EXISTS "Only admins can manage book batches" ON public.admin_book_batches;
CREATE POLICY "Only admins can manage book batches" 
ON public.admin_book_batches 
FOR ALL 
USING (public.is_current_user_admin());

-- تحديث سياسات admin_batch_books لاستخدام الدالة الآمنة
DROP POLICY IF EXISTS "Only admins can manage batch books" ON public.admin_batch_books;
CREATE POLICY "Only admins can manage batch books" 
ON public.admin_batch_books 
FOR ALL 
USING (public.is_current_user_admin());