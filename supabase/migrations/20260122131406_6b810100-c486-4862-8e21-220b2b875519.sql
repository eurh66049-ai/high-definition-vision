-- Create suggestion_likes table
CREATE TABLE public.suggestion_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  suggestion_id UUID NOT NULL REFERENCES public.suggestions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(suggestion_id, user_id)
);

-- Enable RLS
ALTER TABLE public.suggestion_likes ENABLE ROW LEVEL SECURITY;

-- Everyone can view likes
CREATE POLICY "Anyone can view suggestion likes"
ON public.suggestion_likes
FOR SELECT
USING (true);

-- Authenticated users can add likes
CREATE POLICY "Authenticated users can add likes"
ON public.suggestion_likes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can remove their own likes
CREATE POLICY "Users can remove their own likes"
ON public.suggestion_likes
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX idx_suggestion_likes_suggestion_id ON public.suggestion_likes(suggestion_id);