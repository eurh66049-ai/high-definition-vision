-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a system AI user in auth.users (raw insert, no password / cannot login)
DO $$
DECLARE
  ai_user_id uuid := '00000000-0000-0000-0000-00000000a1a1';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = ai_user_id) THEN
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      ai_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'ai-system@kotobi.internal',
      crypt('!disabled-ai-system-account-no-login!' || gen_random_uuid()::text, gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"system","providers":["system"]}'::jsonb,
      '{"name":"Kotobi AI","system":true}'::jsonb,
      false, '', '', '', ''
    );
  END IF;

  INSERT INTO public.profiles (id, username, email, bio, is_verified)
  VALUES (
    ai_user_id,
    'Kotobi AI',
    'ai-system@kotobi.internal',
    'حساب آلي يولّد اقتباسات من الكتب باستخدام الذكاء الاصطناعي',
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    bio = EXCLUDED.bio,
    is_verified = true;
END $$;

-- Log table to track which books had quotes generated and when
CREATE TABLE IF NOT EXISTS public.ai_quote_generation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL,
  quotes_generated integer NOT NULL DEFAULT 0,
  generated_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'success',
  error_message text
);

CREATE INDEX IF NOT EXISTS idx_ai_quote_log_book_id ON public.ai_quote_generation_log(book_id);
CREATE INDEX IF NOT EXISTS idx_ai_quote_log_generated_at ON public.ai_quote_generation_log(generated_at DESC);

ALTER TABLE public.ai_quote_generation_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "log readable by everyone" ON public.ai_quote_generation_log;
CREATE POLICY "log readable by everyone"
  ON public.ai_quote_generation_log FOR SELECT
  USING (true);