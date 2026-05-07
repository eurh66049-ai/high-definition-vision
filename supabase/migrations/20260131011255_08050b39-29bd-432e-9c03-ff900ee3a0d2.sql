-- إضافة سياسات RLS للسماح للمستخدمين بتعديل وحذف ردودهم
CREATE POLICY "Users can update their own replies"
ON public.suggestion_replies
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own replies"
ON public.suggestion_replies
FOR DELETE
USING (auth.uid() = user_id);