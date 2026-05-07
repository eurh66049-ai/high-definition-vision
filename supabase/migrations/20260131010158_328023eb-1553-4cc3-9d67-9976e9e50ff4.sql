-- إضافة سياسة RLS للسماح للمُرسل بإلغاء/حذف طلب المراسلة المُعلق
CREATE POLICY "Senders can delete their pending requests"
ON public.message_requests
FOR DELETE
USING (
  auth.uid() = sender_id 
  AND status = 'pending'
);