-- إنشاء دوال إدارة توثيق المؤلفين

-- دالة للتحقق من صلاحيات المدير
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid() AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- دالة توثيق المؤلف
CREATE OR REPLACE FUNCTION public.verify_author(p_author_id UUID, p_author_name TEXT)
RETURNS VOID AS $$
BEGIN
  -- التحقق من صلاحيات المدير
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'غير مسموح - يجب أن تكون مدير للقيام بهذا الإجراء';
  END IF;
  
  -- إدراج أو تحديث توثيق المؤلف
  INSERT INTO public.verified_authors (
    author_id,
    author_name,
    verified_by,
    verified_at,
    is_verified
  ) VALUES (
    p_author_id,
    p_author_name,
    auth.uid(),
    NOW(),
    true
  )
  ON CONFLICT (author_id) 
  DO UPDATE SET
    is_verified = true,
    verified_by = auth.uid(),
    verified_at = NOW(),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة إلغاء توثيق المؤلف
CREATE OR REPLACE FUNCTION public.unverify_author(p_author_id UUID)
RETURNS VOID AS $$
BEGIN
  -- التحقق من صلاحيات المدير
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'غير مسموح - يجب أن تكون مدير للقيام بهذا الإجراء';
  END IF;
  
  -- تحديث حالة التوثيق إلى false أو حذف السجل
  UPDATE public.verified_authors 
  SET 
    is_verified = false,
    verified_by = auth.uid(),
    verified_at = NOW(),
    updated_at = NOW()
  WHERE author_id = p_author_id;
  
  -- إذا لم يوجد سجل للتحديث، لا نحتاج لفعل شيء
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة التحقق من توثيق المؤلف بالـ ID
CREATE OR REPLACE FUNCTION public.is_author_verified(p_author_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.verified_authors 
    WHERE author_id = p_author_id AND is_verified = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- دالة التحقق من توثيق المؤلف بالاسم
CREATE OR REPLACE FUNCTION public.is_author_verified_by_name(p_author_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.verified_authors 
    WHERE LOWER(author_name) = LOWER(p_author_name) AND is_verified = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- إعطاء صلاحيات تنفيذ الدوال
GRANT EXECUTE ON FUNCTION public.verify_author(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unverify_author(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_author_verified(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_author_verified_by_name(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated;