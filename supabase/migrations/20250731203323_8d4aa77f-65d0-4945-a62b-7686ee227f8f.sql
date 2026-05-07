-- التحقق من وجود triggers متبقية وحذفها
DROP TRIGGER IF EXISTS trigger_generate_book_meta_tags ON public.book_submissions CASCADE;
DROP TRIGGER IF EXISTS after_book_insert_update ON public.book_submissions CASCADE;
DROP TRIGGER IF EXISTS generate_meta_tags_trigger ON public.book_submissions CASCADE;

-- حذف جميع الدوال المرتبطة بـ meta tags
DROP FUNCTION IF EXISTS public.generate_book_meta_tags() CASCADE;
DROP FUNCTION IF EXISTS public.create_page_meta_tags() CASCADE;
DROP FUNCTION IF EXISTS public.update_page_meta_tags() CASCADE;

-- إضافة policy مؤقتة للسماح بالإدخال في page_meta_tags (إذا كان الجدول موجود)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'page_meta_tags' AND table_schema = 'public') THEN
        -- تمكين RLS إذا لم يكن مُفعل
        ALTER TABLE public.page_meta_tags ENABLE ROW LEVEL SECURITY;
        
        -- حذف جميع policies الموجودة
        DROP POLICY IF EXISTS "Allow authenticated users to insert meta tags" ON public.page_meta_tags;
        DROP POLICY IF EXISTS "Allow system to insert meta tags" ON public.page_meta_tags;
        DROP POLICY IF EXISTS "page_meta_tags_insert_policy" ON public.page_meta_tags;
        
        -- إنشاء policy جديدة تسمح بالإدخال للمستخدمين المُسجلين
        CREATE POLICY "allow_authenticated_insert" ON public.page_meta_tags
            FOR INSERT
            TO authenticated
            WITH CHECK (true);
            
        -- إنشاء policy للقراءة
        CREATE POLICY "allow_authenticated_select" ON public.page_meta_tags
            FOR SELECT
            TO authenticated
            USING (true);
    END IF;
END $$;