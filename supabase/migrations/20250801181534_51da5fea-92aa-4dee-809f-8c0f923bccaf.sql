-- إنشاء دالة verify_author إذا لم تكن موجودة
CREATE OR REPLACE FUNCTION public.verify_author(
  p_author_id UUID,
  p_author_name TEXT
) 
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_current_user_id UUID;
BEGIN
  -- الحصول على معرف المستخدم الحالي
  v_current_user_id := auth.uid();
  
  -- التحقق من أن المستخدم مدير
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = v_current_user_id AND is_active = true
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'غير مسموح - يجب أن تكون مدير للقيام بهذا الإجراء';
  END IF;
  
  -- إدراج أو تحديث التوثيق
  INSERT INTO public.verified_authors (
    author_id,
    author_name,
    verified_by,
    verified_at,
    is_verified
  ) VALUES (
    p_author_id,
    p_author_name,
    v_current_user_id,
    NOW(),
    true
  )
  ON CONFLICT (author_id) 
  DO UPDATE SET
    is_verified = true,
    verified_by = v_current_user_id,
    verified_at = NOW(),
    updated_at = NOW();
  
  RETURN true;
END;
$$;

-- إنشاء دالة unverify_author
CREATE OR REPLACE FUNCTION public.unverify_author(
  p_author_id UUID
) 
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_current_user_id UUID;
BEGIN
  -- الحصول على معرف المستخدم الحالي
  v_current_user_id := auth.uid();
  
  -- التحقق من أن المستخدم مدير
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = v_current_user_id AND is_active = true
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'غير مسموح - يجب أن تكون مدير للقيام بهذا الإجراء';
  END IF;
  
  -- حذف التوثيق أو تحديثه
  DELETE FROM public.verified_authors 
  WHERE author_id = p_author_id;
  
  RETURN true;
END;
$$;

-- إنشاء دالة للتحقق من توثيق المؤلف
CREATE OR REPLACE FUNCTION public.is_author_verified(
  p_author_id UUID
) 
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.verified_authors 
    WHERE author_id = p_author_id AND is_verified = true
  );
END;
$$;

-- إنشاء دالة للتحقق من توثيق المؤلف بالاسم
CREATE OR REPLACE FUNCTION public.is_author_verified_by_name(
  p_author_name TEXT
) 
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.verified_authors va
    WHERE va.author_name = p_author_name AND va.is_verified = true
  );
END;
$$;