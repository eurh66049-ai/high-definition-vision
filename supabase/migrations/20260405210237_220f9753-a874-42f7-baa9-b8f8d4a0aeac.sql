
CREATE TABLE public.reader_assistant_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  book_id TEXT NOT NULL,
  message_text TEXT NOT NULL,
  is_bot BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_reader_assistant_messages_user_book 
  ON public.reader_assistant_messages (user_id, book_id, created_at);

ALTER TABLE public.reader_assistant_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own assistant messages"
  ON public.reader_assistant_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own assistant messages"
  ON public.reader_assistant_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own assistant messages"
  ON public.reader_assistant_messages FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
