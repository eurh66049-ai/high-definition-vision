
-- 1) Mark bot profiles explicitly
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_ai_bot BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_is_ai_bot ON public.profiles(is_ai_bot) WHERE is_ai_bot = true;

-- 2) Bot accounts table
CREATE TABLE IF NOT EXISTS public.ai_bot_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  personality TEXT NOT NULL DEFAULT 'balanced',
  review_style TEXT NOT NULL DEFAULT 'balanced', -- strict | balanced | lenient
  bio TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_bot_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bot accounts are viewable by everyone"
  ON public.ai_bot_accounts FOR SELECT USING (true);

-- 3) Activity log to avoid duplicate processing
CREATE TABLE IF NOT EXISTS public.ai_bot_book_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID NOT NULL REFERENCES public.ai_bot_accounts(id) ON DELETE CASCADE,
  book_id UUID NOT NULL,
  action_type TEXT NOT NULL, -- review | like | dislike | skipped
  rating INTEGER,
  sentiment TEXT, -- positive | negative | neutral
  status TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(bot_id, book_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_bot_log_book ON public.ai_bot_book_activity_log(book_id);
CREATE INDEX IF NOT EXISTS idx_ai_bot_log_bot ON public.ai_bot_book_activity_log(bot_id);

ALTER TABLE public.ai_bot_book_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bot activity log is viewable by everyone"
  ON public.ai_bot_book_activity_log FOR SELECT USING (true);

-- 4) Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_ai_bot_accounts_updated ON public.ai_bot_accounts;
CREATE TRIGGER trg_ai_bot_accounts_updated
  BEFORE UPDATE ON public.ai_bot_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
