-- إصلاح مشكلة user_id في الرفع المجمع للكتب
-- تحويل عمود user_id ليصبح nullable للسماح بالكتب المرفوعة من الإدارة

ALTER TABLE public.book_submissions 
ALTER COLUMN user_id DROP NOT NULL;

-- تحديث RLS policies للسماح بالكتب المرفوعة بدون user_id
-- إضافة policy جديد للسماح للإدارة برفع كتب بدون user_id
CREATE POLICY "Enable admin bulk upload without user_id" 
ON public.book_submissions 
FOR INSERT 
WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

-- تحديث policy للقراءة للسماح بقراءة الكتب بدون user_id
DROP POLICY IF EXISTS "Enable read for approved books" ON public.book_submissions;
CREATE POLICY "Enable read for approved books" 
ON public.book_submissions 
FOR SELECT 
USING (status = 'approved' OR auth.uid() = user_id);