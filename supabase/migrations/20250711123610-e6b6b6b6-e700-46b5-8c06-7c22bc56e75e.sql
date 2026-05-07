-- إنشاء وظيفة لحذف الكتب المعتمدة مع تنظيف الملفات
CREATE OR REPLACE FUNCTION public.delete_approved_book_with_cleanup(
  p_book_id uuid,
  p_reason text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_book_record RECORD;
  v_submission_record RECORD;
  v_cover_filename text;
  v_book_filename text;
  v_author_filename text;
  v_deleted_files integer := 0;
BEGIN
  -- التحقق من صلاحيات المدير
  IF NOT is_current_user_admin() THEN
    RAISE EXCEPTION 'غير مسموح لك بحذف الكتب';
  END IF;

  -- جلب بيانات الكتاب من approved_books view
  SELECT * INTO v_book_record 
  FROM public.approved_books 
  WHERE id = p_book_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'لم يتم العثور على الكتاب المعتمد';
  END IF;

  -- جلب بيانات submission المرتبطة
  SELECT * INTO v_submission_record
  FROM public.book_submissions
  WHERE id = p_book_id AND status = 'approved';

  IF FOUND THEN
    -- حذف صورة الغلاف من storage
    IF v_submission_record.cover_image_url IS NOT NULL AND v_submission_record.cover_image_url != '' THEN
      v_cover_filename := split_part(v_submission_record.cover_image_url, '/', -1);
      
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
    IF v_submission_record.book_file_url IS NOT NULL AND v_submission_record.book_file_url != '' THEN
      v_book_filename := split_part(v_submission_record.book_file_url, '/', -1);
      
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
    IF v_submission_record.author_image_url IS NOT NULL AND v_submission_record.author_image_url != '' THEN
      v_author_filename := split_part(v_submission_record.author_image_url, '/', -1);
      
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
    DELETE FROM public.book_recommendations WHERE book_id = p_book_id::text;
    
    -- تحديث حالة submission إلى deleted بدلاً من حذفه
    UPDATE public.book_submissions 
    SET 
      status = 'deleted',
      reviewer_notes = COALESCE(reviewer_notes, '') || ' | حُذف من المكتبة: ' || COALESCE(p_reason, 'لم يتم ذكر السبب'),
      reviewed_at = NOW()
    WHERE id = p_book_id;

    -- إرسال إشعار للمستخدم عن حذف الكتاب
    IF v_submission_record.user_id IS NOT NULL THEN
      INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        book_submission_id,
        book_title,
        book_author,
        book_category
      ) VALUES (
        v_submission_record.user_id,
        'تم حذف كتابك من المكتبة',
        'تم حذف كتاب "' || v_submission_record.title || '" من المكتبة. السبب: ' || COALESCE(p_reason, 'لم يتم ذكر السبب'),
        'error',
        v_submission_record.id,
        v_submission_record.title,
        v_submission_record.author,
        v_submission_record.category
      );
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'message', 'تم حذف الكتاب وجميع الملفات المرتبطة به',
      'deleted_files', v_deleted_files,
      'book_title', v_submission_record.title
    );
  ELSE
    RAISE EXCEPTION 'لم يتم العثور على الكتاب في طلبات الكتب';
  END IF;

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;