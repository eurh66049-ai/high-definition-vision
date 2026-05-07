-- إنشاء جدول للكتب المعتمدة إذا لم يكن موجوداً
CREATE TABLE IF NOT EXISTS public.approved_books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid REFERENCES public.book_submissions(id) ON DELETE CASCADE,
  title text NOT NULL,
  subtitle text,
  author text NOT NULL,
  category text NOT NULL,
  publisher text,
  translator text,
  description text NOT NULL,
  language text NOT NULL,
  publication_year integer,
  page_count integer,
  cover_image_url text,
  book_file_url text,
  file_type text,
  display_type text NOT NULL DEFAULT 'free',
  rights_confirmation boolean DEFAULT false,
  user_id uuid NOT NULL,
  user_email text,
  views integer DEFAULT 0,
  rating numeric DEFAULT 0.0,
  file_size bigint,
  file_metadata jsonb DEFAULT '{}',
  processing_status text DEFAULT 'completed',
  author_bio text,
  author_image_url text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  reviewed_at timestamp with time zone DEFAULT now()
);

-- تمكين Row Level Security
ALTER TABLE public.approved_books ENABLE ROW LEVEL SECURITY;

-- إنشاء policies للوصول إلى الكتب المعتمدة
CREATE POLICY "Approved books are viewable by everyone" 
ON public.approved_books 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage approved books" 
ON public.approved_books 
FOR ALL 
USING (is_current_user_admin())
WITH CHECK (is_current_user_admin());

-- إنشاء view للكتب المعتمدة
CREATE OR REPLACE VIEW public.approved_books_view AS
SELECT 
  ab.*,
  bs.slug
FROM public.approved_books ab
LEFT JOIN public.book_submissions bs ON ab.submission_id = bs.id
WHERE ab.is_active = true;

-- إنشاء وظيفة لحذف الكتب المعتمدة مع تنظيف الملفات
CREATE OR REPLACE FUNCTION public.delete_approved_book(
  p_book_id uuid,
  p_reason text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_book_record RECORD;
  v_cover_filename text;
  v_book_filename text;
  v_author_filename text;
  v_deleted_files integer := 0;
BEGIN
  -- التحقق من صلاحيات المدير
  IF NOT is_current_user_admin() THEN
    RAISE EXCEPTION 'غير مسموح لك بحذف الكتب';
  END IF;

  -- جلب بيانات الكتاب
  SELECT * INTO v_book_record 
  FROM public.approved_books 
  WHERE id = p_book_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'لم يتم العثور على الكتاب';
  END IF;

  -- حذف صورة الغلاف من storage
  IF v_book_record.cover_image_url IS NOT NULL AND v_book_record.cover_image_url != '' THEN
    v_cover_filename := split_part(v_book_record.cover_image_url, '/', -1);
    
    IF v_cover_filename IS NOT NULL AND v_cover_filename != '' THEN
      -- حذف من جميع buckets المحتملة
      DELETE FROM storage.objects 
      WHERE bucket_id IN ('book-covers', 'book-files', 'public')
      AND (name = v_cover_filename 
           OR name LIKE '%' || v_cover_filename 
           OR name LIKE 'covers/%' || v_cover_filename);
      
      v_deleted_files := v_deleted_files + 1;
    END IF;
  END IF;

  -- حذف ملف الكتاب من storage
  IF v_book_record.book_file_url IS NOT NULL AND v_book_record.book_file_url != '' THEN
    v_book_filename := split_part(v_book_record.book_file_url, '/', -1);
    
    IF v_book_filename IS NOT NULL AND v_book_filename != '' THEN
      DELETE FROM storage.objects 
      WHERE bucket_id IN ('book-covers', 'book-files', 'public')
      AND (name = v_book_filename 
           OR name LIKE '%' || v_book_filename 
           OR name LIKE 'pdfs/%' || v_book_filename);
      
      v_deleted_files := v_deleted_files + 1;
    END IF;
  END IF;

  -- حذف صورة المؤلف من storage
  IF v_book_record.author_image_url IS NOT NULL AND v_book_record.author_image_url != '' THEN
    v_author_filename := split_part(v_book_record.author_image_url, '/', -1);
    
    IF v_author_filename IS NOT NULL AND v_author_filename != '' THEN
      DELETE FROM storage.objects 
      WHERE bucket_id IN ('book-covers', 'book-files', 'public')
      AND (name = v_author_filename 
           OR name LIKE '%' || v_author_filename 
           OR name LIKE 'authors/%' || v_author_filename);
      
      v_deleted_files := v_deleted_files + 1;
    END IF;
  END IF;

  -- حذف البيانات المرتبطة
  DELETE FROM public.book_reviews WHERE book_id = p_book_id;
  DELETE FROM public.book_stats WHERE book_id = p_book_id;
  DELETE FROM public.reading_progress WHERE book_id = p_book_id::text;
  
  -- حذف الكتاب من approved_books
  DELETE FROM public.approved_books WHERE id = p_book_id;

  -- إرسال إشعار للمستخدم عن حذف الكتاب
  IF v_book_record.user_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      book_title,
      book_author,
      book_category
    ) VALUES (
      v_book_record.user_id,
      'تم حذف كتابك من المكتبة',
      'تم حذف كتاب "' || v_book_record.title || '" من المكتبة. السبب: ' || COALESCE(p_reason, 'لم يتم ذكر السبب'),
      'error',
      v_book_record.title,
      v_book_record.author,
      v_book_record.category
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'تم حذف الكتاب وجميع الملفات المرتبطة به',
    'deleted_files', v_deleted_files,
    'book_title', v_book_record.title
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;