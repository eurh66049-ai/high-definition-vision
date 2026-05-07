-- Create site_updates table for admin announcements
CREATE TABLE public.site_updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.site_updates ENABLE ROW LEVEL SECURITY;

-- Everyone can read active updates
CREATE POLICY "Anyone can view active site updates"
ON public.site_updates
FOR SELECT
USING (is_active = true);

-- Only admins can manage updates (insert/update/delete)
CREATE POLICY "Admins can insert site updates"
ON public.site_updates
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND is_active = true
  )
);

CREATE POLICY "Admins can update site updates"
ON public.site_updates
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND is_active = true
  )
);

CREATE POLICY "Admins can delete site updates"
ON public.site_updates
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND is_active = true
  )
);

-- Create table for tracking read status
CREATE TABLE public.site_update_reads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  update_id UUID NOT NULL REFERENCES public.site_updates(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, update_id)
);

-- Enable RLS
ALTER TABLE public.site_update_reads ENABLE ROW LEVEL SECURITY;

-- Users can only see their own read status
CREATE POLICY "Users can view own read status"
ON public.site_update_reads
FOR SELECT
USING (auth.uid() = user_id);

-- Users can mark updates as read
CREATE POLICY "Users can mark updates as read"
ON public.site_update_reads
FOR INSERT
WITH CHECK (auth.uid() = user_id);