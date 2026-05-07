-- Create reading_history table to track user reading progress
CREATE TABLE IF NOT EXISTS public.reading_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id uuid NOT NULL,
  book_title text NOT NULL,
  book_author text,
  book_cover_url text,
  current_page integer NOT NULL DEFAULT 1,
  total_pages integer NOT NULL,
  progress_percentage integer GENERATED ALWAYS AS (
    CASE 
      WHEN total_pages > 0 THEN ROUND((current_page::numeric / total_pages::numeric) * 100)
      ELSE 0
    END
  ) STORED,
  last_read_at timestamp with time zone NOT NULL DEFAULT now(),
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  is_completed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, book_id)
);

-- Enable RLS
ALTER TABLE public.reading_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own reading history"
ON public.reading_history
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reading history"
ON public.reading_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reading history"
ON public.reading_history
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reading history"
ON public.reading_history
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_reading_history_user_id ON public.reading_history(user_id);
CREATE INDEX idx_reading_history_last_read ON public.reading_history(user_id, last_read_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_reading_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  
  -- Auto-complete when reaching the last page
  IF NEW.current_page >= NEW.total_pages AND NEW.is_completed = false THEN
    NEW.is_completed = true;
    NEW.completed_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_reading_history_timestamp
BEFORE UPDATE ON public.reading_history
FOR EACH ROW
EXECUTE FUNCTION update_reading_history_updated_at();