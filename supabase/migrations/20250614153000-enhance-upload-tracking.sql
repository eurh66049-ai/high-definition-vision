
-- إضافة أعمدة تتبع التقدم للرفع (إذا لم تكن موجودة مسبقًا)
ALTER TABLE public.book_submissions
ADD COLUMN IF NOT EXISTS upload_progress integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS upload_status text DEFAULT 'not_started',
ADD COLUMN IF NOT EXISTS upload_error_message text DEFAULT NULL;

-- دالة لتحسين تحديث التقدم (تحديث فقط عند الحاجة وتقليل الضغط)
CREATE OR REPLACE FUNCTION public.update_large_file_upload_progress(
  p_submission_id uuid,
  p_progress integer,
  p_status text DEFAULT 'in_progress',
  p_error_message text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- نحدث التقدم وحالة الرفع وخطأ إن وجد
  UPDATE public.book_submissions 
  SET 
    upload_progress = p_progress,
    upload_status = p_status,
    upload_error_message = p_error_message,
    processing_status = CASE 
      WHEN p_status = 'completed' THEN 'processing'
      WHEN p_status = 'failed' THEN 'failed'
      ELSE processing_status
    END
  WHERE id = p_submission_id;
END;
$$;

-- يمكن لاحقًا استدعاء هذه الدالة من Edge function أو من نظام Node بمعدل أقل (مثل فقط بعد كل 10% تقدم أو chunk كبير)
