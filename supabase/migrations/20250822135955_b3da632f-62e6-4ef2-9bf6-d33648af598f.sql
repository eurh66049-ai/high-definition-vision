-- إضافة عمود is_read إلى جدول notifications إذا لم يكن موجوداً
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'is_read'
    ) THEN
        ALTER TABLE public.notifications 
        ADD COLUMN is_read BOOLEAN DEFAULT false;
        
        -- تحديث جميع الإشعارات الموجودة لتكون غير مقروءة بشكل افتراضي
        UPDATE public.notifications 
        SET is_read = false 
        WHERE is_read IS NULL;
        
        RAISE NOTICE 'تم إضافة عمود is_read إلى جدول notifications';
    ELSE
        RAISE NOTICE 'عمود is_read موجود بالفعل في جدول notifications';
    END IF;
END $$;