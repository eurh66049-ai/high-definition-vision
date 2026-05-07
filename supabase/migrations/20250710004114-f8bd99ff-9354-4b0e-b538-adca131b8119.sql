-- إضافة RLS policy للسماح للمستخدمين بحذف طلبات الكتب الخاصة بهم التي لا تزال قيد المراجعة
CREATE POLICY "Users can delete their own pending submissions" 
ON public.book_submissions 
FOR DELETE 
USING (auth.uid() = user_id AND status = 'pending');