
-- Function to add a book review
CREATE OR REPLACE FUNCTION public.add_book_review(
  p_book_id TEXT,
  p_user_id UUID,
  p_rating INTEGER,
  p_comment TEXT,
  p_recommend BOOLEAN DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_review_id UUID;
  v_book_uuid UUID;
BEGIN
  -- Convert the book_id to UUID if possible, or generate a new UUID based on the text
  BEGIN
    v_book_uuid := p_book_id::UUID;
  EXCEPTION WHEN others THEN
    -- For numeric IDs, generate a deterministic UUID using MD5
    v_book_uuid := MD5(p_book_id)::UUID;
  END;

  INSERT INTO public.book_reviews(book_id, user_id, rating, comment, recommend)
  VALUES (v_book_uuid, p_user_id, p_rating, p_comment, p_recommend)
  RETURNING id INTO v_review_id;
  
  -- Update book average rating
  UPDATE public.books
  SET rating = (
    SELECT AVG(rating)::numeric(3,1)
    FROM public.book_reviews
    WHERE book_id = v_book_uuid
    AND rating IS NOT NULL
  )
  WHERE id = v_book_uuid;
  
  RETURN v_review_id;
END;
$$;

-- Function to get book reviews with user information
CREATE OR REPLACE FUNCTION public.get_book_reviews(
  p_book_id TEXT
) 
RETURNS TABLE (
  id UUID,
  book_id UUID,
  user_id UUID,
  rating INTEGER,
  comment TEXT,
  recommend BOOLEAN,
  created_at TIMESTAMPTZ,
  username TEXT,
  avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_book_uuid UUID;
BEGIN
  -- Convert the book_id to UUID if possible, or generate a new UUID based on the text
  BEGIN
    v_book_uuid := p_book_id::UUID;
  EXCEPTION WHEN others THEN
    -- For numeric IDs, generate a deterministic UUID using MD5
    v_book_uuid := MD5(p_book_id)::UUID;
  END;

  RETURN QUERY 
  SELECT 
    br.id,
    br.book_id,
    br.user_id,
    br.rating,
    br.comment,
    br.recommend,
    br.created_at,
    p.username,
    p.avatar_url
  FROM 
    public.book_reviews br
  LEFT JOIN 
    public.profiles p ON br.user_id = p.id
  WHERE 
    br.book_id = v_book_uuid
  ORDER BY 
    br.created_at DESC;
END;
$$;

-- Function to check if a user has already reviewed a book
CREATE OR REPLACE FUNCTION public.has_user_reviewed(
  p_book_id TEXT,
  p_user_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_book_uuid UUID;
BEGIN
  -- Convert the book_id to UUID if possible, or generate a new UUID based on the text
  BEGIN
    v_book_uuid := p_book_id::UUID;
  EXCEPTION WHEN others THEN
    -- For numeric IDs, generate a deterministic UUID using MD5
    v_book_uuid := MD5(p_book_id)::UUID;
  END;

  RETURN EXISTS (
    SELECT 1
    FROM public.book_reviews
    WHERE book_id = v_book_uuid
    AND user_id = p_user_id
  );
END;
$$;

-- Function to get book review statistics
CREATE OR REPLACE FUNCTION public.get_book_review_stats(
  p_book_id TEXT
) 
RETURNS TABLE (
  total_reviews INTEGER,
  average_rating NUMERIC,
  five_star_count INTEGER,
  four_star_count INTEGER,
  three_star_count INTEGER,
  two_star_count INTEGER,
  one_star_count INTEGER,
  recommend_count INTEGER,
  not_recommend_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_book_uuid UUID;
BEGIN
  -- Convert the book_id to UUID if possible, or generate a new UUID based on the text
  BEGIN
    v_book_uuid := p_book_id::UUID;
  EXCEPTION WHEN others THEN
    -- For numeric IDs, generate a deterministic UUID using MD5
    v_book_uuid := MD5(p_book_id)::UUID;
  END;

  RETURN QUERY 
  SELECT 
    COUNT(*)::INTEGER AS total_reviews,
    COALESCE(AVG(rating), 0)::NUMERIC(3,1) AS average_rating,
    COUNT(*) FILTER (WHERE rating = 5)::INTEGER AS five_star_count,
    COUNT(*) FILTER (WHERE rating = 4)::INTEGER AS four_star_count,
    COUNT(*) FILTER (WHERE rating = 3)::INTEGER AS three_star_count,
    COUNT(*) FILTER (WHERE rating = 2)::INTEGER AS two_star_count,
    COUNT(*) FILTER (WHERE rating = 1)::INTEGER AS one_star_count,
    COUNT(*) FILTER (WHERE recommend = TRUE)::INTEGER AS recommend_count,
    COUNT(*) FILTER (WHERE recommend = FALSE)::INTEGER AS not_recommend_count
  FROM 
    public.book_reviews
  WHERE 
    book_id = v_book_uuid;
END;
$$;

-- Add recommend column to book_reviews if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'book_reviews' 
    AND column_name = 'recommend'
  ) THEN
    ALTER TABLE public.book_reviews ADD COLUMN recommend BOOLEAN;
  END IF;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Error adding recommend column: %', SQLERRM;
END
$$;
