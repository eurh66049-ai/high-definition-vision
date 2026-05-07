-- إنشاء دالة تحديث updated_at
CREATE OR REPLACE FUNCTION public.update_fingerprint_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- إنشاء جدول لتخزين بيانات بصمة القراء المجمعة
CREATE TABLE public.reader_fingerprints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id TEXT NOT NULL,
  page_number INTEGER NOT NULL,
  paragraph_index INTEGER DEFAULT 0,
  
  pause_count INTEGER DEFAULT 0,
  reread_count INTEGER DEFAULT 0,
  slow_read_count INTEGER DEFAULT 0,
  total_readers INTEGER DEFAULT 0,
  
  hint_type TEXT DEFAULT NULL,
  hint_message TEXT DEFAULT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(book_id, page_number, paragraph_index)
);

-- إنشاء جدول لجلسات القراءة الفردية
CREATE TABLE public.reading_sessions_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  book_id TEXT NOT NULL,
  page_number INTEGER NOT NULL,
  time_spent_seconds INTEGER DEFAULT 0,
  scroll_backs INTEGER DEFAULT 0,
  reading_speed TEXT DEFAULT 'normal',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- فهارس للأداء
CREATE INDEX idx_reader_fingerprints_book ON public.reader_fingerprints(book_id);
CREATE INDEX idx_reader_fingerprints_lookup ON public.reader_fingerprints(book_id, page_number);
CREATE INDEX idx_reading_sessions_tracking_book ON public.reading_sessions_tracking(book_id);
CREATE INDEX idx_reading_sessions_tracking_session ON public.reading_sessions_tracking(session_id);

-- تمكين RLS
ALTER TABLE public.reader_fingerprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_sessions_tracking ENABLE ROW LEVEL SECURITY;

-- سياسات القراءة والكتابة للجميع (بيانات مجهولة)
CREATE POLICY "Anyone can read fingerprints" ON public.reader_fingerprints FOR SELECT USING (true);
CREATE POLICY "Anyone can insert fingerprints" ON public.reader_fingerprints FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update fingerprints" ON public.reader_fingerprints FOR UPDATE USING (true);
CREATE POLICY "Anyone can insert sessions" ON public.reading_sessions_tracking FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read sessions" ON public.reading_sessions_tracking FOR SELECT USING (true);

-- دالة لتحديث البصمات
CREATE OR REPLACE FUNCTION public.update_reader_fingerprint(
  p_book_id TEXT,
  p_page_number INTEGER,
  p_paragraph_index INTEGER DEFAULT 0,
  p_is_pause BOOLEAN DEFAULT false,
  p_is_reread BOOLEAN DEFAULT false,
  p_is_slow BOOLEAN DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO reader_fingerprints (book_id, page_number, paragraph_index, pause_count, reread_count, slow_read_count, total_readers)
  VALUES (
    p_book_id,
    p_page_number,
    COALESCE(p_paragraph_index, 0),
    CASE WHEN p_is_pause THEN 1 ELSE 0 END,
    CASE WHEN p_is_reread THEN 1 ELSE 0 END,
    CASE WHEN p_is_slow THEN 1 ELSE 0 END,
    1
  )
  ON CONFLICT (book_id, page_number, paragraph_index)
  DO UPDATE SET
    pause_count = reader_fingerprints.pause_count + CASE WHEN p_is_pause THEN 1 ELSE 0 END,
    reread_count = reader_fingerprints.reread_count + CASE WHEN p_is_reread THEN 1 ELSE 0 END,
    slow_read_count = reader_fingerprints.slow_read_count + CASE WHEN p_is_slow THEN 1 ELSE 0 END,
    total_readers = reader_fingerprints.total_readers + 1,
    updated_at = now();
END;
$$;

-- دالة لجلب التلميحات الذكية
CREATE OR REPLACE FUNCTION public.get_page_hints(
  p_book_id TEXT,
  p_page_number INTEGER
)
RETURNS TABLE(
  paragraph_index INTEGER,
  hint_type TEXT,
  hint_message TEXT,
  relevance_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rf.paragraph_index,
    CASE 
      WHEN rf.pause_count > rf.total_readers * 0.3 THEN 'popular_pause'
      WHEN rf.reread_count > rf.total_readers * 0.25 THEN 'common_confusion'
      WHEN rf.slow_read_count > rf.total_readers * 0.4 THEN 'important_content'
      ELSE NULL
    END AS hint_type,
    CASE 
      WHEN rf.pause_count > rf.total_readers * 0.3 THEN 'هذه الفقرة يتوقف عندها كثير من القرّاء'
      WHEN rf.reread_count > rf.total_readers * 0.25 THEN 'هذه الفقرة يُعيد قراءتها أغلب القرّاء'
      WHEN rf.slow_read_count > rf.total_readers * 0.4 THEN 'محتوى مهم - خذ وقتك في قراءته'
      ELSE NULL
    END AS hint_message,
    (rf.pause_count + rf.reread_count * 1.5 + rf.slow_read_count)::NUMERIC / NULLIF(rf.total_readers, 0) AS relevance_score
  FROM reader_fingerprints rf
  WHERE rf.book_id = p_book_id
    AND rf.page_number = p_page_number
    AND rf.total_readers >= 5
    AND (
      rf.pause_count > rf.total_readers * 0.3
      OR rf.reread_count > rf.total_readers * 0.25
      OR rf.slow_read_count > rf.total_readers * 0.4
    )
  ORDER BY relevance_score DESC
  LIMIT 3;
END;
$$;

-- تريجر لتحديث updated_at
CREATE TRIGGER update_reader_fingerprints_updated_at
BEFORE UPDATE ON public.reader_fingerprints
FOR EACH ROW
EXECUTE FUNCTION public.update_fingerprint_updated_at();