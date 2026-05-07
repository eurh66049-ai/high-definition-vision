-- Backfill missing author images for Agatha Christie and set authors.avatar_url to provided link
DO $$
DECLARE
  v_author  TEXT := 'أجاثا كريستي';
  v_avatar  TEXT := 'https://encrypted-tbn2.gstatic.com/images?q=tbn:ANd9GcSpyi_oz9jGIvQiKb0Jw0kmsu9iFV5gtyOawjtloUo97txWd6O8JQQzh3B7WwpaVRQUVWJxqaJw0vOXfkX-qQ1LQzGAVQiFQFQ9x6NYTg';
BEGIN
  -- Fill missing author_image_url in book_submissions (all statuses)
  UPDATE public.book_submissions
  SET author_image_url = v_avatar
  WHERE public.normalize_author_name(author) = public.normalize_author_name(v_author)
    AND (author_image_url IS NULL OR author_image_url = '');

  -- Update authors table avatar to the same link
  UPDATE public.authors
  SET avatar_url = v_avatar
  WHERE public.normalize_author_name(name) = public.normalize_author_name(v_author);
END $$;