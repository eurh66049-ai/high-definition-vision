
-- وظيفة حذف المستخدم من supabase_auth.users
CREATE OR REPLACE FUNCTION public.delete_user()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid;
  _status boolean;
BEGIN
  -- الحصول على معرف المستخدم الحالي
  _uid := auth.uid();

  -- التأكد من أن المستخدم قام بتسجيل الدخول
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول أولاً';
  END IF;

  -- حذف المستخدم من supabase_auth.users
  SELECT EXISTS (
    SELECT FROM pg_catalog.pg_roles
    WHERE rolname = 'supabase_auth_admin'
  ) INTO _status;

  IF _status = TRUE THEN
    -- إذا كان الدور موجودًا، استخدمه لحذف المستخدم
    BEGIN
      EXECUTE 'SET LOCAL ROLE supabase_auth_admin';
      EXECUTE format('DELETE FROM auth.users WHERE id = %L', _uid);
      RESET ROLE;
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      RETURN json_build_object('success', false, 'error', SQLERRM);
    END;
  ELSE
    -- إذا لم يكن الدور موجودًا، فشل العملية
    RETURN json_build_object('success', false, 'error', 'الأذونات المطلوبة غير متوفرة');
  END IF;

  RETURN json_build_object('success', true);
END;
$$;

-- منح أذونات الاستخدام لجميع المستخدمين المصادق عليهم
GRANT EXECUTE ON FUNCTION public.delete_user() TO authenticated;
