
-- Create story_likes table for heart reactions
CREATE TABLE public.story_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(story_id, user_id)
);

-- Enable RLS
ALTER TABLE public.story_likes ENABLE ROW LEVEL SECURITY;

-- Anyone can see likes
CREATE POLICY "Anyone can view story likes"
ON public.story_likes FOR SELECT
USING (true);

-- Users can like stories
CREATE POLICY "Users can like stories"
ON public.story_likes FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can unlike stories
CREATE POLICY "Users can unlike their likes"
ON public.story_likes FOR DELETE
USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX idx_story_likes_story_id ON public.story_likes(story_id);
CREATE INDEX idx_story_likes_user_id ON public.story_likes(user_id);
