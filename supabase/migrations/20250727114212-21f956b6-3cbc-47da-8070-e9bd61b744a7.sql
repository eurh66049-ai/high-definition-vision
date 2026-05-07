-- إنشاء نظام حماية شامل للملفات
-- ================================

-- 1. إنشاء جدول backup للملفات المحذوفة
CREATE TABLE IF NOT EXISTS public.deleted_files_backup (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_book_id UUID NOT NULL,
  original_file_url TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'cover', 'pdf', 'author_image'
  deletion_reason TEXT,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_by UUID
);

-- 2. إنشاء جدول مراقبة الملفات المفقودة
CREATE TABLE IF NOT EXISTS public.missing_files_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  error_message TEXT,
  reported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'reported' -- 'reported', 'fixing', 'fixed', 'permanent_loss'
);

-- 3. دالة للتحقق من وجود الملفات في storage
CREATE OR REPLACE FUNCTION public.check_file_exists_in_storage(file_url TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  bucket_name TEXT;
  file_path TEXT;
  file_exists BOOLEAN;
BEGIN
  -- استخراج bucket و path من URL
  IF file_url LIKE '%/storage/v1/object/public/%' THEN
    -- تقسيم URL لاستخراج bucket وpath
    bucket_name := split_part(split_part(file_url, '/storage/v1/object/public/', 2), '/', 1);
    file_path := substring(split_part(file_url, '/storage/v1/object/public/', 2) from length(bucket_name) + 2);
    
    -- التحقق من وجود الملف
    SELECT EXISTS(
      SELECT 1 FROM storage.objects 
      WHERE bucket_id = bucket_name AND name = file_path
    ) INTO file_exists;
    
    RETURN file_exists;
  END IF;
  
  -- إذا لم يكن URL صحيح، نعتبر الملف غير موجود
  RETURN FALSE;
END;
$$;

-- 4. دالة شاملة للتحقق من سلامة ملفات الكتب
CREATE OR REPLACE FUNCTION public.check_books_file_integrity()
RETURNS TABLE(
  book_id UUID,
  title TEXT,
  missing_cover BOOLEAN,
  missing_pdf BOOLEAN,
  missing_author_image BOOLEAN,
  cover_url TEXT,
  pdf_url TEXT,
  author_image_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bs.id,
    bs.title,
    CASE 
      WHEN bs.cover_image_url IS NOT NULL THEN NOT public.check_file_exists_in_storage(bs.cover_image_url)
      ELSE FALSE
    END as missing_cover,
    CASE 
      WHEN bs.book_file_url IS NOT NULL THEN NOT public.check_file_exists_in_storage(bs.book_file_url)
      ELSE FALSE
    END as missing_pdf,
    CASE 
      WHEN bs.author_image_url IS NOT NULL THEN NOT public.check_file_exists_in_storage(bs.author_image_url)
      ELSE FALSE
    END as missing_author_image,
    bs.cover_image_url,
    bs.book_file_url,
    bs.author_image_url
  FROM public.book_submissions bs
  WHERE bs.status = 'approved';
END;
$$;

-- 5. دالة تسجيل الملفات المفقودة
CREATE OR REPLACE FUNCTION public.log_missing_file(
  p_book_id UUID,
  p_file_url TEXT,
  p_file_type TEXT,
  p_error_message TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- تسجيل الملف المفقود إذا لم يكن مسجل من قبل
  INSERT INTO public.missing_files_log (book_id, file_url, file_type, error_message)
  SELECT p_book_id, p_file_url, p_file_type, p_error_message
  WHERE NOT EXISTS (
    SELECT 1 FROM public.missing_files_log 
    WHERE book_id = p_book_id AND file_url = p_file_url AND status != 'fixed'
  );
END;
$$;

-- 6. دالة استعادة الملفات من backup (إذا أمكن)
CREATE OR REPLACE FUNCTION public.restore_missing_files()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  restored_count INTEGER := 0;
  missing_record RECORD;
BEGIN
  -- البحث عن الملفات المفقودة وتسجيلها
  FOR missing_record IN 
    SELECT * FROM public.check_books_file_integrity()
    WHERE missing_cover = TRUE OR missing_pdf = TRUE OR missing_author_image = TRUE
  LOOP
    -- تسجيل الملفات المفقودة
    IF missing_record.missing_cover THEN
      PERFORM public.log_missing_file(
        missing_record.book_id, 
        missing_record.cover_url, 
        'cover', 
        'ملف غلاف مفقود'
      );
    END IF;
    
    IF missing_record.missing_pdf THEN
      PERFORM public.log_missing_file(
        missing_record.book_id, 
        missing_record.pdf_url, 
        'pdf', 
        'ملف PDF مفقود'
      );
    END IF;
    
    IF missing_record.missing_author_image THEN
      PERFORM public.log_missing_file(
        missing_record.book_id, 
        missing_record.author_image_url, 
        'author_image', 
        'صورة المؤلف مفقودة'
      );
    END IF;
  END LOOP;
  
  GET DIAGNOSTICS restored_count = ROW_COUNT;
  RETURN restored_count;
END;
$$;

-- 7. تحديث دالة حذف الكتب لتكون أكثر حذراً
CREATE OR REPLACE FUNCTION public.safe_cleanup_rejected_book_files()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cover_filename TEXT;
  book_filename TEXT;
BEGIN
  -- فقط إذا تم تغيير الحالة إلى rejected
  IF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
    
    -- تسجيل الملفات في backup قبل الحذف
    IF NEW.cover_image_url IS NOT NULL AND NEW.cover_image_url != '' THEN
      INSERT INTO public.deleted_files_backup (
        original_book_id, original_file_url, file_type, deletion_reason, deleted_by
      ) VALUES (
        NEW.id, NEW.cover_image_url, 'cover', 'Book rejected', auth.uid()
      );
    END IF;
    
    IF NEW.book_file_url IS NOT NULL AND NEW.book_file_url != '' THEN
      INSERT INTO public.deleted_files_backup (
        original_book_id, original_file_url, file_type, deletion_reason, deleted_by
      ) VALUES (
        NEW.id, NEW.book_file_url, 'pdf', 'Book rejected', auth.uid()
      );
    END IF;
    
    IF NEW.author_image_url IS NOT NULL AND NEW.author_image_url != '' THEN
      INSERT INTO public.deleted_files_backup (
        original_book_id, original_file_url, file_type, deletion_reason, deleted_by
      ) VALUES (
        NEW.id, NEW.author_image_url, 'author_image', 'Book rejected', auth.uid()
      );
    END IF;
    
    -- لا نحذف الملفات فوراً، بل نحتفظ بها لمدة معينة
    -- يمكن إضافة job منفصل لحذفها لاحقاً
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- 8. استبدال trigger القديم بالآمن
DROP TRIGGER IF EXISTS cleanup_rejected_book_files_trigger ON public.book_submissions;

CREATE TRIGGER safe_cleanup_rejected_book_files_trigger
  AFTER UPDATE ON public.book_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.safe_cleanup_rejected_book_files();

-- 9. RLS للجداول الجديدة
ALTER TABLE public.deleted_files_backup ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missing_files_log ENABLE ROW LEVEL SECURITY;

-- Admin يمكنه الوصول لكل شيء
CREATE POLICY "Admins can access deleted files backup"
ON public.deleted_files_backup FOR ALL
USING (is_current_user_admin())
WITH CHECK (is_current_user_admin());

CREATE POLICY "Admins can access missing files log"
ON public.missing_files_log FOR ALL
USING (is_current_user_admin())
WITH CHECK (is_current_user_admin());

-- المستخدمون يمكنهم رؤية ملفاتهم المحذوفة فقط
CREATE POLICY "Users can view their deleted files"
ON public.deleted_files_backup FOR SELECT
USING (EXISTS(
  SELECT 1 FROM public.book_submissions bs 
  WHERE bs.id = original_book_id AND bs.user_id = auth.uid()
));

-- إنشاء فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_deleted_files_backup_book_id ON public.deleted_files_backup(original_book_id);
CREATE INDEX IF NOT EXISTS idx_missing_files_log_book_id ON public.missing_files_log(book_id);
CREATE INDEX IF NOT EXISTS idx_missing_files_log_status ON public.missing_files_log(status);