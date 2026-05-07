-- Drop the restrictive SELECT policy
DROP POLICY IF EXISTS "Anyone can view active site updates" ON public.site_updates;

-- Create a new policy that allows admins to see all updates
CREATE POLICY "Admins can view all site updates"
ON public.site_updates
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
    AND admin_users.is_active = true
  )
);

-- Create a policy for public users to see only active updates
CREATE POLICY "Public can view active site updates"
ON public.site_updates
FOR SELECT
USING (is_active = true);