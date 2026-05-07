
CREATE TABLE public.book_news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  book_name TEXT,
  author_name TEXT,
  summary TEXT,
  news_type TEXT DEFAULT 'general',
  image_url TEXT,
  source_url TEXT,
  source_name TEXT,
  published_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_published BOOLEAN DEFAULT true
);

ALTER TABLE public.book_news ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published book news"
  ON public.book_news
  FOR SELECT
  USING (is_published = true);

CREATE INDEX idx_book_news_published_at ON public.book_news (published_at DESC);
