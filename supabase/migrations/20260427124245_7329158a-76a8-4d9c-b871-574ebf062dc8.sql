-- Allow admins to update bot accounts (needed for toggling is_active)
CREATE POLICY "Admins can update bot accounts"
ON public.ai_bot_accounts
FOR UPDATE
USING (is_current_user_admin())
WITH CHECK (is_current_user_admin());