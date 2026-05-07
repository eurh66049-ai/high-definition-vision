-- Fix recursive admin_users policy and restrict admin checks
BEGIN;

-- Remove problematic recursive policies
DROP POLICY IF EXISTS "Admins can manage admin table" ON public.admin_users;
DROP POLICY IF EXISTS "Admins can manage challenges" ON public.challenges;
DROP POLICY IF EXISTS "Admins can manage rewards" ON public.challenge_rewards;

-- Create safe admin check function
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

-- Safe admin_users policies (no recursive calls)
CREATE POLICY "Users insert their admin row" ON public.admin_users
FOR INSERT
WITH CHECK (auth.role() = 'service_role' OR auth.uid() = user_id);

CREATE POLICY "Users update their admin row" ON public.admin_users
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete their admin row" ON public.admin_users
FOR DELETE
USING (auth.uid() = user_id);

-- challenges: separate policies for different operations to avoid infinite recursion on SELECT
CREATE POLICY "Admins can insert challenges" ON public.challenges
FOR INSERT
WITH CHECK (public.is_current_user_admin());

CREATE POLICY "Admins can update challenges" ON public.challenges
FOR UPDATE
USING (public.is_current_user_admin())
WITH CHECK (public.is_current_user_admin());

CREATE POLICY "Admins can delete challenges" ON public.challenges
FOR DELETE
USING (public.is_current_user_admin());

-- challenge_rewards: same pattern
CREATE POLICY "Admins can insert rewards" ON public.challenge_rewards
FOR INSERT
WITH CHECK (public.is_current_user_admin());

CREATE POLICY "Admins can update rewards" ON public.challenge_rewards
FOR UPDATE
USING (public.is_current_user_admin())
WITH CHECK (public.is_current_user_admin());

CREATE POLICY "Admins can delete rewards" ON public.challenge_rewards
FOR DELETE
USING (public.is_current_user_admin());

-- Helper functions for challenge functionality
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