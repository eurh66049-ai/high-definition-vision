-- Fix the deleted_files_backup table to allow NULL values for original_file_url
-- This is needed for CSV uploaded books that may not have file URLs

ALTER TABLE deleted_files_backup 
ALTER COLUMN original_file_url DROP NOT NULL;

-- Add a comment to explain why this column can be NULL
COMMENT ON COLUMN deleted_files_backup.original_file_url IS 'Can be NULL for CSV uploaded books or books without file URLs';

-- Drop the existing function first
DROP FUNCTION IF EXISTS unapprove_book_instead_of_delete(UUID, TEXT);

-- Recreate the function with proper NULL handling
CREATE OR REPLACE FUNCTION unapprove_book_instead_of_delete(
    p_book_id UUID,
    p_reason TEXT
) RETURNS JSON AS $$
DECLARE
    v_book_record RECORD;
    v_result JSON;
    v_deleted_files INTEGER := 0;
BEGIN
    -- التحقق من وجود الكتاب
    SELECT * INTO v_book_record
    FROM approved_books
    WHERE id = p_book_id AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'الكتاب غير موجود أو محذوف مسبقاً'
        );
    END IF;

    -- نسخ احتياطي للملفات مع التعامل مع القيم الفارغة
    -- غلاف الكتاب
    IF v_book_record.cover_image_url IS NOT NULL AND v_book_record.cover_image_url != '' THEN
        INSERT INTO deleted_files_backup (
            original_book_id, 
            original_file_url, 
            file_type, 
            deletion_reason
        ) VALUES (
            p_book_id, 
            v_book_record.cover_image_url, 
            'cover_image', 
            p_reason
        );
        v_deleted_files := v_deleted_files + 1;
    END IF;

    -- ملف الكتاب
    IF v_book_record.book_file_url IS NOT NULL AND v_book_record.book_file_url != '' THEN
        INSERT INTO deleted_files_backup (
            original_book_id, 
            original_file_url, 
            file_type, 
            deletion_reason
        ) VALUES (
            p_book_id, 
            v_book_record.book_file_url, 
            'book_file', 
            p_reason
        );
        v_deleted_files := v_deleted_files + 1;
    END IF;

    -- صورة المؤلف
    IF v_book_record.author_image_url IS NOT NULL AND v_book_record.author_image_url != '' THEN
        INSERT INTO deleted_files_backup (
            original_book_id, 
            original_file_url, 
            file_type, 
            deletion_reason
        ) VALUES (
            p_book_id, 
            v_book_record.author_image_url, 
            'author_image', 
            p_reason
        );
        v_deleted_files := v_deleted_files + 1;
    END IF;

    -- إعادة الكتاب إلى قائمة الانتظار بدلاً من الحذف النهائي
    UPDATE approved_books 
    SET 
        is_active = false,
        reviewed_at = NOW()
    WHERE id = p_book_id;

    -- إضافة السجل إلى book_submissions إذا لم يكن موجوداً
    IF NOT EXISTS (SELECT 1 FROM book_submissions WHERE original_book_id = p_book_id) THEN
        INSERT INTO book_submissions (
            original_book_id,
            title,
            subtitle,
            author,
            description,
            category,
            language,
            publisher,
            translator,
            publication_year,
            page_count,
            cover_image_url,
            book_file_url,
            author_image_url,
            author_bio,
            file_type,
            file_size,
            display_type,
            rights_confirmation,
            user_id,
            user_email,
            status,
            reviewer_notes,
            rating,
            views,
            slug,
            is_edit_request
        )
        SELECT 
            id,
            title,
            subtitle,
            author,
            description,
            category,
            language,
            publisher,
            translator,
            publication_year,
            page_count,
            cover_image_url,
            book_file_url,
            author_image_url,
            author_bio,
            file_type,
            file_size,
            display_type,
            rights_confirmation,
            user_id,
            user_email,
            'pending',
            p_reason,
            rating,
            views,
            slug,
            true
        FROM approved_books 
        WHERE id = p_book_id;
    ELSE
        -- تحديث السجل الموجود
        UPDATE book_submissions 
        SET 
            status = 'pending',
            reviewer_notes = p_reason,
            is_edit_request = true,
            reviewed_at = NOW()
        WHERE original_book_id = p_book_id;
    END IF;

    -- إرجاع النتيجة
    RETURN json_build_object(
        'success', true,
        'message', 'تم إلغاء الموافقة وإعادة الكتاب لقائمة الانتظار بنجاح',
        'book_title', v_book_record.title,
        'deleted_files', v_deleted_files
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', 'حدث خطأ أثناء إلغاء الموافقة: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;