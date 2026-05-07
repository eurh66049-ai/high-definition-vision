ALTER TABLE public.book_submissions
ADD COLUMN IF NOT EXISTS source_cover_image_url text,
ADD COLUMN IF NOT EXISTS source_book_file_url text;

CREATE INDEX IF NOT EXISTS idx_book_submissions_source_book_file_url_lookup
ON public.book_submissions ((lower(btrim(source_book_file_url))))
WHERE source_book_file_url IS NOT NULL AND source_book_file_url <> '';

CREATE INDEX IF NOT EXISTS idx_book_submissions_normalized_title_author_lookup
ON public.book_submissions (
  (lower(regexp_replace(btrim(title), '\s+', ' ', 'g'))),
  (lower(regexp_replace(btrim(coalesce(author, '')), '\s+', ' ', 'g')))
)
WHERE status = 'approved';

CREATE UNIQUE INDEX IF NOT EXISTS uniq_book_submissions_approved_source_book_file_url
ON public.book_submissions ((lower(btrim(source_book_file_url))))
WHERE status = 'approved' AND source_book_file_url IS NOT NULL AND source_book_file_url <> '';