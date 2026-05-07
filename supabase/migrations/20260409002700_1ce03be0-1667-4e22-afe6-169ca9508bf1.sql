
-- 1) Add target_url column to notifications
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS target_url TEXT;

-- 2) Create trigger function for review like notifications
CREATE OR REPLACE FUNCTION public.notify_review_author_on_like()
RETURNS TRIGGER AS $$
DECLARE
  v_review RECORD;
  v_liker_name TEXT;
  v_book_title TEXT;
  v_book_slug TEXT;
BEGIN
  -- Get the review details
  SELECT br.user_id, br.book_id, br.comment
  INTO v_review
  FROM public.book_reviews br
  WHERE br.id = NEW.review_id;

  -- Don't notify if user liked their own review
  IF v_review.user_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Get liker username
  SELECT COALESCE(p.username, 'مستخدم') INTO v_liker_name
  FROM public.profiles p
  WHERE p.id = NEW.user_id;

  -- Get book title and slug
  SELECT bs.title, bs.slug INTO v_book_title, v_book_slug
  FROM public.book_submissions bs
  WHERE bs.id = v_review.book_id
  LIMIT 1;

  -- Avoid duplicate notifications
  IF NOT EXISTS (
    SELECT 1 FROM public.notifications
    WHERE user_id = v_review.user_id
      AND type = 'review_like'
      AND book_submission_id = v_review.book_id
      AND message LIKE '%' || v_liker_name || '%'
      AND created_at > NOW() - INTERVAL '1 hour'
  ) THEN
    INSERT INTO public.notifications (
      user_id, type, title, message,
      book_title, book_submission_id, target_url, created_at
    ) VALUES (
      v_review.user_id,
      'review_like',
      'إعجاب بتعليقك',
      format('أعجب %s بتعليقك على كتاب %s', v_liker_name, COALESCE(v_book_title, 'كتاب')),
      v_book_title,
      v_review.book_id,
      CASE 
        WHEN v_book_slug IS NOT NULL THEN '/book/' || v_book_slug
        ELSE '/book/' || v_review.book_id::text
      END,
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on review_likes
DROP TRIGGER IF EXISTS trigger_notify_review_like ON public.review_likes;
CREATE TRIGGER trigger_notify_review_like
  AFTER INSERT ON public.review_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_review_author_on_like();

-- 3) Update the new book approval trigger to include target_url
CREATE OR REPLACE FUNCTION notify_followers_on_book_approval()
RETURNS TRIGGER AS $$
DECLARE
  author_record RECORD;
  follower_record RECORD;
  v_target_url TEXT;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    SELECT id, name INTO author_record
    FROM authors
    WHERE name = NEW.author
    LIMIT 1;

    -- Build target URL
    v_target_url := CASE 
      WHEN NEW.slug IS NOT NULL THEN '/book/' || NEW.slug
      ELSE '/book/' || NEW.id::text
    END;

    IF author_record.id IS NOT NULL THEN
      FOR follower_record IN 
        SELECT user_id 
        FROM author_followers 
        WHERE author_id = author_record.id
      LOOP
        IF NOT EXISTS (
          SELECT 1 FROM notifications 
          WHERE user_id = follower_record.user_id 
          AND book_submission_id = NEW.id 
          AND type = 'new_book'
          AND created_at > NOW() - INTERVAL '1 hour'
        ) THEN
          INSERT INTO notifications (
            user_id, type, title, message,
            book_title, book_author, book_category,
            book_submission_id, target_url, created_at
          ) VALUES (
            follower_record.user_id,
            'new_book',
            'كتاب جديد من مؤلف تتابعه',
            format('نشر %s كتاباً جديداً: %s', author_record.name, NEW.title),
            NEW.title,
            NEW.author,
            NEW.category,
            NEW.id,
            v_target_url,
            NOW()
          );
        END IF;
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
