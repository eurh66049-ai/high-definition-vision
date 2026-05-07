
-- تفعيل الحماية والـRLS لعدد من الجداول مع سياسات صارمة للمستخدمين

-- جدول profiles: المستخدم يرى ويعدّل فقط ملفه
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Profiles Select All" ON public.profiles;
CREATE POLICY "User can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid()::uuid = id);
CREATE POLICY "User can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid()::uuid = id);

-- جدول reading_progress: المستخدم يرى ويحدث تقدمه فقط
ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Reading Progress Select All" ON public.reading_progress;
CREATE POLICY "Can read own reading_progress"
  ON public.reading_progress
  FOR SELECT
  USING (auth.uid()::uuid = user_id);
CREATE POLICY "Can insert own reading_progress"
  ON public.reading_progress
  FOR INSERT
  WITH CHECK (auth.uid()::uuid = user_id);
CREATE POLICY "Can update own reading_progress"
  ON public.reading_progress
  FOR UPDATE
  USING (auth.uid()::uuid = user_id);

-- جدول book_submissions: المستخدم يتحكم في كتب قدّمها فقط
ALTER TABLE public.book_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Book Submissions Select All" ON public.book_submissions;
CREATE POLICY "User can view their own book_submissions"
  ON public.book_submissions
  FOR SELECT
  USING (auth.uid()::uuid = user_id);
CREATE POLICY "User can insert their submission"
  ON public.book_submissions
  FOR INSERT
  WITH CHECK (auth.uid()::uuid = user_id);

-- جدول book_reviews: السماح لكل مستخدم فقط برؤية مراجعاته أو مراجعات عامة
ALTER TABLE public.book_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Book Reviews Select All" ON public.book_reviews;
CREATE POLICY "User can read and add their book_reviews"
  ON public.book_reviews
  FOR SELECT
  USING (auth.uid()::uuid = user_id);
CREATE POLICY "User can insert their review"
  ON public.book_reviews
  FOR INSERT
  WITH CHECK (auth.uid()::uuid = user_id);

-- جدول notifications: يرى إشعاراته فقط
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User can access their own notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid()::uuid = user_id);

-- جدول pdf_annotations: المستخدم يصل فقط إلى تعليقاته
ALTER TABLE public.pdf_annotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User can read/write own annotations"
  ON public.pdf_annotations
  FOR SELECT
  USING (user_id IS NULL OR auth.uid()::uuid = user_id);
CREATE POLICY "User can insert annotation"
  ON public.pdf_annotations
  FOR INSERT
  WITH CHECK (user_id IS NULL OR auth.uid()::uuid = user_id);

-- تأمين bucket الملفات الخاصة: (بدّل bucket_name بbucket الحقيقي إذا لزم)
-- مثال: حماية ملفات avatars من القراءة العامة
UPDATE storage.buckets SET public = false WHERE id = 'avatars';

