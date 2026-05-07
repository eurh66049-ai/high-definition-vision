
-- Add file_hash column to book_extracted_text to enable pre-submission caching
ALTER TABLE public.book_extracted_text
  ADD COLUMN IF NOT EXISTS file_hash text;

CREATE INDEX IF NOT EXISTS idx_book_extracted_text_file_hash
  ON public.book_extracted_text (file_hash);

-- Allow the row to exist before book_id is known (during submission flow):
-- make book_id nullable so we can cache extracted text keyed by file_hash only.
ALTER TABLE public.book_extracted_text
  ALTER COLUMN book_id DROP NOT NULL;

-- Allow authenticated users to insert their own pre-submission cache rows
-- (book_id is null, only file_hash is set).
DROP POLICY IF EXISTS "Authenticated users can cache extracted text" ON public.book_extracted_text;
CREATE POLICY "Authenticated users can cache extracted text"
  ON public.book_extracted_text
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Allow authenticated users to update cached rows (e.g., link book_id once known)
DROP POLICY IF EXISTS "Authenticated users can update cached extracted text" ON public.book_extracted_text;
CREATE POLICY "Authenticated users can update cached extracted text"
  ON public.book_extracted_text
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL);
