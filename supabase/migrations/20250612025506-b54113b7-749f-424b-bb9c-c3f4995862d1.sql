
-- حذف جدول file_uploads وتحديث book_submissions لإضافة معلومات حجم الملف

-- أولاً، حذف الدالة التي تعتمد على جدول file_uploads
DROP FUNCTION IF EXISTS public.save_file_upload_info(uuid, uuid, text, text, bigint, text);
DROP FUNCTION IF EXISTS public.get_user_file_uploads(uuid);

-- حذف الفهارس المرتبطة بجدول file_uploads
DROP INDEX IF EXISTS idx_file_uploads_user_id;
DROP INDEX IF EXISTS idx_file_uploads_submission_id;

-- حذف جدول file_uploads نهائياً
DROP TABLE IF EXISTS public.file_uploads;

-- التأكد من وجود عمود file_size في جدول book_submissions
-- (هذا العمود موجود بالفعل لكن للتأكد)
ALTER TABLE public.book_submissions 
ADD COLUMN IF NOT EXISTS file_size bigint;

-- إضافة عمود جديد لتخزين تفاصيل أكثر عن الملف
ALTER TABLE public.book_submissions 
ADD COLUMN IF NOT EXISTS file_metadata jsonb DEFAULT '{}';

-- تحديث approved_books للتأكد من وجود عمود file_size
ALTER TABLE public.approved_books 
ADD COLUMN IF NOT EXISTS file_size bigint;

-- إنشاء دالة محدثة لحفظ معلومات الملف مباشرة في book_submissions
CREATE OR REPLACE FUNCTION public.update_book_submission_file_info(
  p_submission_id UUID,
  p_file_size BIGINT,
  p_file_metadata JSONB DEFAULT '{}'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- تحديث معلومات الملف في جدول book_submissions
  UPDATE public.book_submissions 
  SET 
    file_size = p_file_size,
    file_metadata = p_file_metadata,
    updated_at = NOW()
  WHERE id = p_submission_id;
  
  -- التحقق من نجاح التحديث
  RETURN FOUND;
END;
$$;

-- تحديث دالة manage-book-submission لتتعامل مع النظام الجديد
-- التأكد من نقل file_size إلى approved_books عند الموافقة
CREATE OR REPLACE FUNCTION public.copy_file_size_on_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- عند تحديث approved_books، التأكد من نسخ file_size من book_submissions
  IF TG_OP = 'INSERT' THEN
    UPDATE public.approved_books 
    SET file_size = (
      SELECT file_size 
      FROM public.book_submissions 
      WHERE id = NEW.submission_id
    )
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- إنشاء تريغر لضمان نسخ file_size عند إنشاء كتاب معتمد
DROP TRIGGER IF EXISTS trigger_copy_file_size_on_approval ON public.approved_books;
CREATE TRIGGER trigger_copy_file_size_on_approval
  AFTER INSERT ON public.approved_books
  FOR EACH ROW
  EXECUTE FUNCTION public.copy_file_size_on_approval();
