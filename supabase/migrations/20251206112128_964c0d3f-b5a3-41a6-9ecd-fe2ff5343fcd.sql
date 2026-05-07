-- Drop problematic policies
DROP POLICY IF EXISTS "Admins can view all site updates" ON public.site_updates;
DROP POLICY IF EXISTS "Public can view active site updates" ON public.site_updates;
DROP POLICY IF EXISTS "Admins can insert site updates" ON public.site_updates;
DROP POLICY IF EXISTS "Admins can update site updates" ON public.site_updates;
DROP POLICY IF EXISTS "Admins can delete site updates" ON public.site_updates;

-- Create simple policies that don't access auth.users directly
-- Anyone can read active site updates (no auth.users access needed)
CREATE POLICY "Public read active updates"
ON public.site_updates
FOR SELECT
USING (is_active = true);

-- Admins can read ALL updates using the is_current_user_admin function
CREATE POLICY "Admins read all updates"
ON public.site_updates
FOR SELECT
USING (is_current_user_admin());

-- Admins can insert using the is_current_user_admin function
CREATE POLICY "Admins insert updates"
ON public.site_updates
FOR INSERT
WITH CHECK (is_current_user_admin());

-- Admins can update using the is_current_user_admin function
CREATE POLICY "Admins update updates"
ON public.site_updates
FOR UPDATE
USING (is_current_user_admin());

-- Admins can delete using the is_current_user_admin function
CREATE POLICY "Admins delete updates"
ON public.site_updates
FOR DELETE
USING (is_current_user_admin());