
-- Add book reference columns to stories table
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS book_id TEXT DEFAULT NULL;
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS book_slug TEXT DEFAULT NULL;

-- Add index for quick lookup of stories linked to a book
CREATE INDEX IF NOT EXISTS idx_stories_book_id ON public.stories (book_id) WHERE book_id IS NOT NULL;
