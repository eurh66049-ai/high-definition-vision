-- First create the function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create suggestions table
CREATE TABLE public.suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create suggestion replies table (only support can reply)
CREATE TABLE public.suggestion_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  suggestion_id UUID NOT NULL REFERENCES public.suggestions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggestion_replies ENABLE ROW LEVEL SECURITY;

-- Suggestions policies
CREATE POLICY "Anyone can view suggestions" 
ON public.suggestions 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create suggestions" 
ON public.suggestions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own suggestions" 
ON public.suggestions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own suggestions" 
ON public.suggestions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Suggestion replies policies
CREATE POLICY "Anyone can view replies" 
ON public.suggestion_replies 
FOR SELECT 
USING (true);

-- Only support email can create replies
CREATE POLICY "Only support can create replies" 
ON public.suggestion_replies 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND email = 'h85342727@gmail.com'
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_suggestions_updated_at
BEFORE UPDATE ON public.suggestions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();