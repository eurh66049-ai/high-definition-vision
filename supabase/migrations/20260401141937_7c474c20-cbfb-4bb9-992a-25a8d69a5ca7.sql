-- Enable RLS on storage_protection_log
ALTER TABLE public.storage_protection_log ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert protection logs
CREATE POLICY "Authenticated users can insert protection logs"
ON public.storage_protection_log
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Only admins can read protection logs
CREATE POLICY "Admins can read protection logs"
ON public.storage_protection_log
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND is_active = true
  )
);

-- Only admins can delete protection logs
CREATE POLICY "Admins can delete protection logs"
ON public.storage_protection_log
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND is_active = true
  )
);