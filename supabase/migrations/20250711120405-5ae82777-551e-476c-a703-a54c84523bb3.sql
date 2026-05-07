
-- إضافة عمود submission_id في approved_books إذا لم يكن موجوداً
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='approved_books' 
        AND column_name='submission_id'
    ) THEN
        ALTER TABLE public.approved_books ADD COLUMN submission_id UUID;
    END IF;
END $$;
