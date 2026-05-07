-- إصلاح جدول approved_books وإضافة RLS policies

-- إضافة primary key constraint
ALTER TABLE public.approved_books ADD CONSTRAINT approved_books_pkey PRIMARY KEY (id);

-- إضافة default value للحقول المطلوبة
ALTER TABLE public.approved_books ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.approved_books ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.approved_books ALTER COLUMN views SET DEFAULT 0;
ALTER TABLE public.approved_books ALTER COLUMN rating SET DEFAULT 0.0;
ALTER TABLE public.approved_books ALTER COLUMN is_active SET DEFAULT true;

-- تمكين RLS على الجدول
ALTER TABLE public.approved_books ENABLE ROW LEVEL SECURITY;

-- إضافة RLS policies للقراءة العامة
CREATE POLICY "Public can read approved books" 
ON public.approved_books 
FOR SELECT 
USING (is_active = true);

-- السماح للإدارة بإدراج وتحديث الكتب المعتمدة
CREATE POLICY "Admins can manage approved books" 
ON public.approved_books 
FOR ALL
USING (EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid() 
    AND is_active = true
));

-- السماح للنظام بإدراج الكتب (للرفع المجمع)
CREATE POLICY "System can insert approved books" 
ON public.approved_books 
FOR INSERT 
WITH CHECK (true);