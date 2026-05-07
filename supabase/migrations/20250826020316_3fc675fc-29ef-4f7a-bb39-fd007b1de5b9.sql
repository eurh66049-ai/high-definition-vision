-- Fix misspelled author name across the database and set avatar
DO $$
DECLARE
  v_wrong   TEXT := 'أغاثا كريستي';
  v_correct TEXT := 'أجاثا كريستي';
  v_avatar  TEXT := 'https://encrypted-tbn2.gstatic.com/images?q=tbn:ANd9GcSpyi_oz9jGIvQiKb0Jw0kmsu9iFV5gtyOawjtloUo97txWd6O8JQQzh3B7WwpaVRQUVWJxqaJw0vOXfkX-qQ1LQzGAVQiFQFQ9x6NYTg';
BEGIN
  -- Update book_submissions
  UPDATE public.book_submissions
  SET 
    author = v_correct,
    author_image_url = COALESCE(author_image_url, v_avatar)
  WHERE public.normalize_author_name(author) = public.normalize_author_name(v_wrong);

  -- Update approved_books (if table/view is updatable)
  BEGIN
    UPDATE public.approved_books
    SET 
      author = v_correct,
      author_image_url = COALESCE(author_image_url, v_avatar)
    WHERE public.normalize_author_name(author) = public.normalize_author_name(v_wrong);
  EXCEPTION WHEN OTHERS THEN
    -- ignore if view not updatable
    NULL;
  END;

  -- Update public_books (if exists and updatable)
  BEGIN
    UPDATE public.public_books
    SET 
      author = v_correct,
      author_image_url = COALESCE(author_image_url, v_avatar)
    WHERE public.normalize_author_name(author) = public.normalize_author_name(v_wrong);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- Update authors table entry (rename and set avatar + new slug)
  UPDATE public.authors
  SET 
    name = v_correct,
    slug = public.generate_author_slug(v_correct),
    avatar_url = v_avatar
  WHERE public.normalize_author_name(name) = public.normalize_author_name(v_wrong);
END $$;