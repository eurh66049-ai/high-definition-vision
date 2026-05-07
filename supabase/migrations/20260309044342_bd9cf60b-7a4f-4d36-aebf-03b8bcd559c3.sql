-- نوادي القراءة الجماعية
CREATE TABLE public.reading_clubs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  book_id UUID NOT NULL,
  book_title TEXT NOT NULL,
  book_cover_url TEXT,
  book_author TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  max_members INTEGER DEFAULT 20,
  current_members INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  start_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  end_date TIMESTAMP WITH TIME ZONE,
  current_page INTEGER DEFAULT 1,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- أعضاء النادي
CREATE TABLE public.reading_club_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID REFERENCES public.reading_clubs(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
  current_page INTEGER DEFAULT 1,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(club_id, user_id)
);

-- رسائل النقاش
CREATE TABLE public.reading_club_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID REFERENCES public.reading_clubs(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  page_reference INTEGER,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- فهارس للأداء
CREATE INDEX idx_reading_clubs_book_id ON public.reading_clubs(book_id);
CREATE INDEX idx_reading_clubs_status ON public.reading_clubs(status);
CREATE INDEX idx_reading_club_members_club ON public.reading_club_members(club_id);
CREATE INDEX idx_reading_club_members_user ON public.reading_club_members(user_id);
CREATE INDEX idx_reading_club_messages_club ON public.reading_club_messages(club_id);

-- تمكين RLS
ALTER TABLE public.reading_clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_club_messages ENABLE ROW LEVEL SECURITY;

-- سياسات reading_clubs
CREATE POLICY "Anyone can view public clubs" ON public.reading_clubs
  FOR SELECT USING (is_public = true OR created_by = auth.uid());

CREATE POLICY "Authenticated users can create clubs" ON public.reading_clubs
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Club creators can update their clubs" ON public.reading_clubs
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Club creators can delete their clubs" ON public.reading_clubs
  FOR DELETE USING (auth.uid() = created_by);

-- سياسات reading_club_members
CREATE POLICY "Anyone can view club members" ON public.reading_club_members
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can join clubs" ON public.reading_club_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members can update their own membership" ON public.reading_club_members
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Members can leave clubs" ON public.reading_club_members
  FOR DELETE USING (auth.uid() = user_id);

-- سياسات reading_club_messages
CREATE POLICY "Club members can view messages" ON public.reading_club_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.reading_club_members 
      WHERE club_id = reading_club_messages.club_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Club members can send messages" ON public.reading_club_messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.reading_club_members 
      WHERE club_id = reading_club_messages.club_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own messages" ON public.reading_club_messages
  FOR DELETE USING (auth.uid() = user_id);

-- تحديث عدد الأعضاء تلقائياً
CREATE OR REPLACE FUNCTION update_club_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.reading_clubs 
    SET current_members = current_members + 1,
        updated_at = now()
    WHERE id = NEW.club_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.reading_clubs 
    SET current_members = current_members - 1,
        updated_at = now()
    WHERE id = OLD.club_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_club_member_change
AFTER INSERT OR DELETE ON public.reading_club_members
FOR EACH ROW EXECUTE FUNCTION update_club_member_count();

-- تمكين Realtime للرسائل
ALTER PUBLICATION supabase_realtime ADD TABLE public.reading_club_messages;