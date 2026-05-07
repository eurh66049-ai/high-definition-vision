-- إصلاح دالة التحقق من صحة بيانات الكتاب للحفاظ على المسافات
CREATE OR REPLACE FUNCTION public.validate_book_submission()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- التحقق من الحقول المطلوبة بدون إزالة المسافات من البداية والنهاية
    IF NEW.title IS NULL OR NEW.title = '' THEN
        RAISE EXCEPTION 'عنوان الكتاب مطلوب';
    END IF;
    
    IF NEW.author IS NULL OR NEW.author = '' THEN
        RAISE EXCEPTION 'اسم المؤلف مطلوب';
    END IF;
    
    IF NEW.category IS NULL OR NEW.category = '' THEN
        RAISE EXCEPTION 'تصنيف الكتاب مطلوب';
    END IF;
    
    IF NEW.description IS NULL OR NEW.description = '' THEN
        RAISE EXCEPTION 'وصف الكتاب مطلوب';
    END IF;
    
    IF NEW.language IS NULL OR NEW.language = '' THEN
        RAISE EXCEPTION 'لغة الكتاب مطلوبة';
    END IF;
    
    IF NEW.user_id IS NULL THEN
        RAISE EXCEPTION 'معرف المستخدم مطلوب';
    END IF;
    
    -- التحقق من صحة الحالة
    IF NEW.status NOT IN ('pending', 'approved', 'rejected') THEN
        NEW.status = 'pending';
    END IF;
    
    -- ضبط التواريخ
    IF NEW.created_at IS NULL THEN
        NEW.created_at = NOW();
    END IF;
    
    -- ضبط القيم الافتراضية
    IF NEW.rights_confirmation IS NULL THEN
        NEW.rights_confirmation = false;
    END IF;
    
    IF NEW.upload_progress IS NULL THEN
        NEW.upload_progress = 0;
    END IF;
    
    IF NEW.display_type IS NULL THEN
        NEW.display_type = 'free';
    END IF;
    
    -- الحفاظ على المسافات في وصف الكتاب ونبذة المؤلف
    -- عدم إجراء أي تعديل على النصوص للحفاظ على التنسيق الأصلي
    
    RETURN NEW;
END;
$$;

-- إنشاء دالة للحفاظ على تنسيق النصوص عند التحديث
CREATE OR REPLACE FUNCTION public.preserve_text_formatting()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- الحفاظ على التنسيق الأصلي للنصوص
    -- عدم إجراء أي تعديل على description و author_bio
    -- للحفاظ على المسافات والأسطر الجديدة
    
    RETURN NEW;
END;
$$;

-- إنشاء trigger للحفاظ على تنسيق النصوص
DROP TRIGGER IF EXISTS preserve_formatting_trigger ON public.book_submissions;
CREATE TRIGGER preserve_formatting_trigger
    BEFORE INSERT OR UPDATE ON public.book_submissions
    FOR EACH ROW
    EXECUTE FUNCTION public.preserve_text_formatting();