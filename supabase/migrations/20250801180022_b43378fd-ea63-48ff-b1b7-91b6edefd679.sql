-- إنشاء جدول للمؤلفين المعتمدين
CREATE TABLE public.verified_authors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL,
  author_name TEXT NOT NULL,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_verified BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إضافة الأدمن المحدد
INSERT INTO public.admin_users (email, user_id, role, is_active)
VALUES ('adilelbourachdi397@gmail.com', NULL, 'super_admin', TRUE)
ON CONFLICT (email) DO UPDATE SET 
  role = 'super_admin',
  is_active = TRUE;

-- إنشاء فهرس للبحث السريع
CREATE INDEX idx_verified_authors_author_id ON public.verified_authors(author_id);
CREATE INDEX idx_verified_authors_name ON public.verified_authors(author_name);

-- تفعيل RLS
ALTER TABLE public.verified_authors ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسات الأمان
CREATE POLICY "Admins can manage verified authors" 
ON public.verified_authors 
FOR ALL 
TO authenticated
USING (is_current_user_admin())
WITH CHECK (is_current_user_admin());

CREATE POLICY "Public can view verified authors" 
ON public.verified_authors 
FOR SELECT 
TO anon, authenticated
USING (is_verified = TRUE);

-- دالة للتحقق من توثيق المؤلف
CREATE OR REPLACE FUNCTION public.is_author_verified(p_author_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM public.verified_authors 
    WHERE author_id = p_author_id AND is_verified = TRUE
  );
END;
$$;

-- دالة للتحقق من توثيق المؤلف بالاسم
CREATE OR REPLACE FUNCTION public.is_author_verified_by_name(p_author_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM public.verified_authors 
    WHERE LOWER(author_name) = LOWER(p_author_name) AND is_verified = TRUE
  );
END;
$$;

-- دالة لتفعيل المؤلف
CREATE OR REPLACE FUNCTION public.verify_author(
  p_author_id UUID,
  p_author_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_user_id UUID;
BEGIN
  -- التحقق من صلاحيات الأدمن
  v_admin_user_id := auth.uid();
  
  IF NOT is_current_user_admin() THEN
    RAISE EXCEPTION 'غير مسموح - يجب أن تكون مدير للقيام بهذا الإجراء';
  END IF;
  
  -- إدراج أو تحديث توثيق المؤلف
  INSERT INTO public.verified_authors (author_id, author_name, verified_by, is_verified)
  VALUES (p_author_id, p_author_name, v_admin_user_id, TRUE)
  ON CONFLICT (author_id) 
  DO UPDATE SET 
    is_verified = TRUE,
    verified_by = v_admin_user_id,
    verified_at = NOW(),
    updated_at = NOW();
    
  RETURN TRUE;
END;
$$;

-- دالة لإلغاء توثيق المؤلف
CREATE OR REPLACE FUNCTION public.unverify_author(p_author_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- التحقق من صلاحيات الأدمن
  IF NOT is_current_user_admin() THEN
    RAISE EXCEPTION 'غير مسموح - يجب أن تكون مدير للقيام بهذا الإجراء';
  END IF;
  
  UPDATE public.verified_authors 
  SET is_verified = FALSE, updated_at = NOW()
  WHERE author_id = p_author_id;
  
  RETURN TRUE;
END;
$$;