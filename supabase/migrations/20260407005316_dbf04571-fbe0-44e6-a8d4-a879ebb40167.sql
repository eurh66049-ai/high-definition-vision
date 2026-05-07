
CREATE TABLE public.quote_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reply_text TEXT NOT NULL,
  parent_reply_id UUID REFERENCES public.quote_replies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_quote_replies_quote_id ON public.quote_replies(quote_id);
CREATE INDEX idx_quote_replies_user_id ON public.quote_replies(user_id);
CREATE INDEX idx_quote_replies_parent ON public.quote_replies(parent_reply_id);

ALTER TABLE public.quote_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view quote replies"
  ON public.quote_replies FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert replies"
  ON public.quote_replies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own replies"
  ON public.quote_replies FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own replies"
  ON public.quote_replies FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
