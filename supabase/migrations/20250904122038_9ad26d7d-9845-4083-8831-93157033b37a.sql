-- Fix recursive admin_users policy and restrict admin checks
BEGIN;

-- Ensure admin check function is correct and safe
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM admin_users au
    JOIN auth.users u ON u.email = au.email
    WHERE u.id = auth.uid()
      AND au.is_active = true
  );
END;
$$;

-- admin_users: remove recursive policy and add safe CRUD policies
DROP POLICY IF EXISTS "Admins can manage admin table" ON public.admin_users;

-- Allow users to read their own admin row (keep existing or create if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'admin_users' AND policyname = 'Users can view their own admin status'
  ) THEN
    CREATE POLICY "Users can view their own admin status" ON public.admin_users
    FOR SELECT
    USING (
      email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );
  END IF;
END $$;

-- Allow user to insert/update/delete only their own row (no recursion)
CREATE POLICY IF NOT EXISTS "Users insert their admin row" ON public.admin_users
FOR INSERT
WITH CHECK ((auth.role() = 'service_role') OR (auth.uid() = user_id));

CREATE POLICY IF NOT EXISTS "Users update their admin row" ON public.admin_users
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users delete their admin row" ON public.admin_users
FOR DELETE
USING (auth.uid() = user_id);

-- challenges: avoid admin policy applying to SELECT to prevent admin_users evaluation on reads
DROP POLICY IF EXISTS "Admins can manage challenges" ON public.challenges;

CREATE POLICY IF NOT EXISTS "Admins can insert challenges" ON public.challenges
FOR INSERT
WITH CHECK (public.is_current_user_admin());

CREATE POLICY IF NOT EXISTS "Admins can update challenges" ON public.challenges
FOR UPDATE
USING (public.is_current_user_admin())
WITH CHECK (public.is_current_user_admin());

CREATE POLICY IF NOT EXISTS "Admins can delete challenges" ON public.challenges
FOR DELETE
USING (public.is_current_user_admin());

-- challenge_rewards: same pattern
DROP POLICY IF EXISTS "Admins can manage rewards" ON public.challenge_rewards;

CREATE POLICY IF NOT EXISTS "Admins can insert rewards" ON public.challenge_rewards
FOR INSERT
WITH CHECK (public.is_current_user_admin());

CREATE POLICY IF NOT EXISTS "Admins can update rewards" ON public.challenge_rewards
FOR UPDATE
USING (public.is_current_user_admin())
WITH CHECK (public.is_current_user_admin());

CREATE POLICY IF NOT EXISTS "Admins can delete rewards" ON public.challenge_rewards
FOR DELETE
USING (public.is_current_user_admin());

-- Helper functions used by the UI
-- Leaderboard RPC
CREATE OR REPLACE FUNCTION public.get_challenge_leaderboard(p_challenge_id uuid)
RETURNS TABLE(user_id uuid, username text, avatar_url text, current_score integer, rank integer)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT 
    cp.user_id,
    COALESCE(p.username, p.email, 'مستخدم') AS username,
    p.avatar_url,
    cp.current_score,
    RANK() OVER (ORDER BY cp.current_score DESC, cp.joined_at ASC) AS rank
  FROM public.challenge_participants cp
  LEFT JOIN public.profiles p ON p.id = cp.user_id
  WHERE cp.challenge_id = p_challenge_id AND cp.is_active = true
  ORDER BY cp.current_score DESC, cp.joined_at ASC
  LIMIT 50;
$$;

-- Update score RPC
CREATE OR REPLACE FUNCTION public.update_challenge_score(
  p_challenge_id uuid,
  p_user_id uuid,
  p_activity_type text,
  p_points integer,
  p_activity_data jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  -- Only allow the logged-in user to update their own score
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Record the activity
  INSERT INTO public.challenge_activities (challenge_id, user_id, activity_type, points, activity_data)
  VALUES (p_challenge_id, p_user_id, p_activity_type, p_points, COALESCE(p_activity_data, '{}'::jsonb));

  -- Update the participant score
  UPDATE public.challenge_participants
  SET current_score = current_score + GREATEST(p_points, 0)
  WHERE challenge_id = p_challenge_id AND user_id = p_user_id AND is_active = true;
END;
$$;

COMMIT;