-- إزالة سياسة الرد القديمة التي تسمح فقط للدعم
DROP POLICY IF EXISTS "Support can create replies" ON public.suggestion_replies;

-- إنشاء سياسة جديدة تسمح لجميع المستخدمين المسجلين بالرد
CREATE POLICY "Authenticated users can create replies" 
ON public.suggestion_replies 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);