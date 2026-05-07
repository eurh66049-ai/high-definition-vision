
-- إنشاء جدول لتتبع تفاصيل رفع الملفات
CREATE TABLE IF NOT EXISTS public.file_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  book_submission_id UUID REFERENCES public.book_submissions(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  upload_path TEXT NOT NULL,
  upload_status TEXT NOT NULL DEFAULT 'uploading',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إضافة فهرس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_file_uploads_user_id ON public.file_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_submission_id ON public.file_uploads(book_submission_id);

-- تحديث جدول book_submissions لإضافة معلومات حجم الملف إذا لم تكن موجودة
ALTER TABLE public.book_submissions 
ADD COLUMN IF NOT EXISTS file_size BIGINT,
ADD COLUMN IF NOT EXISTS author_bio TEXT,
ADD COLUMN IF NOT EXISTS author_image_url TEXT;

-- إنشاء دالة لحفظ معلومات الملف المرفوع
CREATE OR REPLACE FUNCTION public.save_file_upload_info(
  p_user_id UUID,
  p_book_submission_id UUID,
  p_file_name TEXT,
  p_file_type TEXT,
  p_file_size BIGINT,
  p_upload_path TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_upload_id UUID;
BEGIN
  -- حفظ معلومات رفع الملف
  INSERT INTO public.file_uploads (
    user_id,
    book_submission_id,
    file_name,
    file_type,
    file_size,
    upload_path,
    upload_status
  ) VALUES (
    p_user_id,
    p_book_submission_id,
    p_file_name,
    p_file_type,
    p_file_size,
    p_upload_path,
    'completed'
  ) RETURNING id INTO v_upload_id;
  
  -- تحديث حجم الملف في جدول book_submissions
  UPDATE public.book_submissions 
  SET file_size = p_file_size
  WHERE id = p_book_submission_id;
  
  RETURN v_upload_id;
END;
$$;

-- إنشاء دالة للحصول على معلومات رفع الملفات للمستخدم
CREATE OR REPLACE FUNCTION public.get_user_file_uploads(p_user_id UUID)
RETURNS TABLE(
  id UUID,
  file_name TEXT,
  file_type TEXT,
  file_size BIGINT,
  upload_status TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  book_title TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fu.id,
    fu.file_name,
    fu.file_type,
    fu.file_size,
    fu.upload_status,
    fu.created_at,
    bs.title as book_title
  FROM public.file_uploads fu
  LEFT JOIN public.book_submissions bs ON fu.book_submission_id = bs.id
  WHERE fu.user_id = p_user_id
  ORDER BY fu.created_at DESC;
END;
$$;
