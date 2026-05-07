
CREATE TABLE public.user_downloads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  book_id uuid NOT NULL,
  book_title text NOT NULL,
  book_author text,
  book_cover_url text,
  book_slug text,
  downloaded_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- فهرس فريد لمنع التكرار
CREATE UNIQUE INDEX idx_user_downloads_unique ON public.user_downloads (user_id, book_id);

-- فهرس للبحث السريع
CREATE INDEX idx_user_downloads_user_id ON public.user_downloads (user_id);
CREATE INDEX idx_user_downloads_downloaded_at ON public.user_downloads (user_id, downloaded_at DESC);

-- تفعيل RLS
ALTER TABLE public.user_downloads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own downloads"
  ON public.user_downloads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own downloads"
  ON public.user_downloads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own downloads"
  ON public.user_downloads FOR DELETE
  USING (auth.uid() = user_id);
