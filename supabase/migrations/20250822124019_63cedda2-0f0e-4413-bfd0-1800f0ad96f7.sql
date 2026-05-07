-- Fix triggers: skip notifications when NEW.user_id IS NULL to avoid NOT NULL violation on CSV imports

-- 1) Update function: handle_book_status_change_with_email
CREATE OR REPLACE FUNCTION public.handle_book_status_change_with_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Skip creating notifications if submission has no user (CSV or system import)
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Only when status changed from pending -> approved
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    -- Ensure no duplicate approval notification
    IF NOT EXISTS (
      SELECT 1 FROM public.notifications 
      WHERE user_id = NEW.user_id 
        AND book_submission_id = NEW.id 
        AND type = 'success'
        AND title LIKE '%موافقة%'
    ) THEN
      -- Insert DB notification
      INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        book_submission_id,
        book_title,
        book_author,
        book_category,
        created_at
      ) VALUES (
        NEW.user_id,
        'تمت الموافقة على كتابك! 🎉',
        'تم قبول كتاب "' || NEW.title || '" وأصبح متاحاً الآن في المكتبة.',
        'success',
        NEW.id,
        NEW.title,
        NEW.author,
        NEW.category,
        COALESCE(NEW.reviewed_at, NOW())
      );

      -- Async email notification via Edge Function
      PERFORM
        net.http_post(
          url := 'https://kydmyxsgyxeubhmqzrgo.supabase.co/functions/v1/send-book-notification',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
          ),
          body := jsonb_build_object(
            'bookId', NEW.id::text,
            'userId', NEW.user_id::text,
            'bookTitle', NEW.title,
            'userEmail', COALESCE(NEW.user_email, ''),
            'bookAuthor', NEW.author,
            'bookCategory', NEW.category
          )
        );
    END IF;

  -- Only when status changed from pending -> rejected
  ELSIF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
    -- Ensure no duplicate rejection notification
    IF NOT EXISTS (
      SELECT 1 FROM public.notifications 
      WHERE user_id = NEW.user_id 
        AND book_submission_id = NEW.id 
        AND type = 'error'
        AND title LIKE '%رفض%'
    ) THEN
      INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        book_submission_id,
        book_title,
        book_author,
        book_category,
        created_at
      ) VALUES (
        NEW.user_id,
        'تم رفض كتابك ❌',
        'نأسف لإبلاغك أن كتاب "' || NEW.title || '" لم يتم قبوله. ' || COALESCE('السبب: ' || NEW.reviewer_notes, ''),
        'error',
        NEW.id,
        NEW.title,
        NEW.author,
        NEW.category,
        COALESCE(NEW.reviewed_at, NOW())
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2) Update function: handle_book_status_change_with_html
CREATE OR REPLACE FUNCTION public.handle_book_status_change_with_html()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Skip creating notifications if submission has no user (CSV or system import)
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Only when status changed from pending -> approved
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    -- Ensure no duplicate approval notification
    IF NOT EXISTS (
      SELECT 1 FROM public.notifications 
      WHERE user_id = NEW.user_id 
        AND book_submission_id = NEW.id 
        AND type = 'success'
        AND title LIKE '%موافقة%'
    ) THEN
      INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        book_submission_id,
        book_title,
        book_author,
        book_category,
        created_at
      ) VALUES (
        NEW.user_id,
        'تمت الموافقة على كتابك! 🎉',
        'تم قبول كتاب "' || NEW.title || '" وأصبح متاحاً الآن في المكتبة.',
        'success',
        NEW.id,
        NEW.title,
        NEW.author,
        NEW.category,
        COALESCE(NEW.reviewed_at, NOW())
      );
    END IF;

  -- Only when status changed from pending -> rejected
  ELSIF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
    -- Ensure no duplicate rejection notification
    IF NOT EXISTS (
      SELECT 1 FROM public.notifications 
      WHERE user_id = NEW.user_id 
        AND book_submission_id = NEW.id 
        AND type = 'error'
        AND title LIKE '%رفض%'
    ) THEN
      INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        book_submission_id,
        book_title,
        book_author,
        book_category,
        created_at
      ) VALUES (
        NEW.user_id,
        'تم رفض كتابك ❌',
        'نأسف لإبلاغك أن كتاب "' || NEW.title || '" لم يتم قبوله. ' || COALESCE('السبب: ' || NEW.reviewer_notes, ''),
        'error',
        NEW.id,
        NEW.title,
        NEW.author,
        NEW.category,
        COALESCE(NEW.reviewed_at, NOW())
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;
