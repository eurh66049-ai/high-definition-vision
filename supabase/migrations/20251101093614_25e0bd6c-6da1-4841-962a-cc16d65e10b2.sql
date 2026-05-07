-- Create function to notify followers when author's book gets approved
CREATE OR REPLACE FUNCTION notify_followers_on_book_approval()
RETURNS TRIGGER AS $$
DECLARE
  author_record RECORD;
  follower_record RECORD;
BEGIN
  -- Only notify when status changes to approved
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Find the author by name
    SELECT id, name INTO author_record
    FROM authors
    WHERE name = NEW.author
    LIMIT 1;

    -- If author exists, notify all followers
    IF author_record.id IS NOT NULL THEN
      FOR follower_record IN 
        SELECT user_id 
        FROM author_followers 
        WHERE author_id = author_record.id
      LOOP
        -- Check if notification doesn't already exist to avoid duplicates
        IF NOT EXISTS (
          SELECT 1 FROM notifications 
          WHERE user_id = follower_record.user_id 
          AND book_submission_id = NEW.id 
          AND type = 'new_book'
          AND created_at > NOW() - INTERVAL '1 hour'
        ) THEN
          -- Insert notification for each follower
          INSERT INTO notifications (
            user_id,
            type,
            title,
            message,
            book_title,
            book_author,
            book_category,
            book_submission_id,
            created_at
          ) VALUES (
            follower_record.user_id,
            'new_book',
            'كتاب جديد من مؤلف تتابعه',
            format('نشر %s كتاباً جديداً: %s', author_record.name, NEW.title),
            NEW.title,
            NEW.author,
            NEW.category,
            NEW.id,
            NOW()
          );
        END IF;
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_notify_followers_on_book_approval ON book_submissions;

-- Create trigger on book_submissions when book gets approved
CREATE TRIGGER trigger_notify_followers_on_book_approval
  AFTER INSERT OR UPDATE OF status ON book_submissions
  FOR EACH ROW
  WHEN (NEW.status = 'approved')
  EXECUTE FUNCTION notify_followers_on_book_approval();

-- Create index to improve notification queries performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_type_created 
  ON notifications(user_id, type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_book_submission 
  ON notifications(book_submission_id, type);

-- Add RLS policy to allow users to delete their notifications
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
CREATE POLICY "Users can delete their own notifications"
  ON notifications
  FOR DELETE
  USING (auth.uid() = user_id);