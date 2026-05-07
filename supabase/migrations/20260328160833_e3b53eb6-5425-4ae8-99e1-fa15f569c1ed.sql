
-- جدول نشاطات المستخدمين
CREATE TABLE public.user_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  target_id text,
  target_title text,
  target_image_url text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_activities_user_id ON public.user_activities(user_id);
CREATE INDEX idx_user_activities_created_at ON public.user_activities(created_at DESC);
CREATE INDEX idx_user_activities_type ON public.user_activities(activity_type);

ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view activities"
  ON public.user_activities FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own activities"
  ON public.user_activities FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own activities"
  ON public.user_activities FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- تسجيل النشاط عند إعجاب بكتاب
CREATE OR REPLACE FUNCTION public.log_book_like_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_title text; v_cover text;
BEGIN
  SELECT title, cover_image_url INTO v_title, v_cover FROM public.book_submissions WHERE id = NEW.book_id AND status = 'approved' LIMIT 1;
  IF v_title IS NOT NULL THEN
    INSERT INTO public.user_activities (user_id, activity_type, target_id, target_title, target_image_url)
    VALUES (NEW.user_id, 'book_like', NEW.book_id, v_title, v_cover);
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_book_like_activity AFTER INSERT ON public.book_likes FOR EACH ROW EXECUTE FUNCTION public.log_book_like_activity();

-- تسجيل النشاط عند مراجعة كتاب
CREATE OR REPLACE FUNCTION public.log_book_review_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_title text; v_cover text;
BEGIN
  SELECT title, cover_image_url INTO v_title, v_cover FROM public.book_submissions WHERE id = NEW.book_id AND status = 'approved' LIMIT 1;
  IF v_title IS NOT NULL THEN
    INSERT INTO public.user_activities (user_id, activity_type, target_id, target_title, target_image_url, metadata)
    VALUES (NEW.user_id, 'book_review', NEW.book_id, v_title, v_cover, jsonb_build_object('rating', NEW.rating));
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_book_review_activity AFTER INSERT ON public.book_reviews FOR EACH ROW EXECUTE FUNCTION public.log_book_review_activity();

-- تسجيل النشاط عند متابعة مستخدم
CREATE OR REPLACE FUNCTION public.log_user_follow_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_username text; v_avatar text;
BEGIN
  SELECT username, avatar_url INTO v_username, v_avatar FROM public.profiles WHERE id = NEW.following_id LIMIT 1;
  INSERT INTO public.user_activities (user_id, activity_type, target_id, target_title, target_image_url)
  VALUES (NEW.follower_id, 'follow_user', NEW.following_id::text, v_username, v_avatar);
  RETURN NEW;
END; $$;

CREATE TRIGGER on_user_follow_activity AFTER INSERT ON public.user_followers FOR EACH ROW EXECUTE FUNCTION public.log_user_follow_activity();
