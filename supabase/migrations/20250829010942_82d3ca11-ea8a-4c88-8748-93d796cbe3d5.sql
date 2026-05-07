-- Create table to track daily message read status for users
CREATE TABLE public.daily_message_reads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  message_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, message_date)
);

-- Enable Row Level Security
ALTER TABLE public.daily_message_reads ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own read status" 
ON public.daily_message_reads 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own read status" 
ON public.daily_message_reads 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Add index for better performance
CREATE INDEX idx_daily_message_reads_user_date ON public.daily_message_reads(user_id, message_date);