-- Create daily_messages table to store one message per day for all users
CREATE TABLE IF NOT EXISTS public.daily_messages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    message TEXT NOT NULL,
    date DATE NOT NULL UNIQUE,
    day_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.daily_messages ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Anyone can read daily messages" 
ON public.daily_messages 
FOR SELECT 
USING (true);

-- Create policy for system to insert/update messages
CREATE POLICY "System can manage daily messages" 
ON public.daily_messages 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create index on date for better performance
CREATE INDEX IF NOT EXISTS idx_daily_messages_date ON public.daily_messages(date);