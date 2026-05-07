
-- Update RLS policy to allow users to update their own draft submissions (not just pending)
DROP POLICY IF EXISTS "Users can update pending submissions" ON public.book_submissions;
CREATE POLICY "Users can update pending or draft submissions"
ON public.book_submissions
FOR UPDATE
USING (auth.uid() = user_id AND status IN ('pending', 'draft'))
WITH CHECK (auth.uid() = user_id AND status IN ('pending', 'draft'));

-- Update RLS policy to allow users to delete their own draft submissions
DROP POLICY IF EXISTS "Enable delete for own pending submissions" ON public.book_submissions;
CREATE POLICY "Enable delete for own pending or draft submissions"
ON public.book_submissions
FOR DELETE
USING (auth.uid() = user_id AND status IN ('pending', 'draft'));

DROP POLICY IF EXISTS "Users can delete their own pending submissions" ON public.book_submissions;
CREATE POLICY "Users can delete their own pending or draft submissions"
ON public.book_submissions
FOR DELETE
USING (auth.uid() = user_id AND status IN ('pending', 'draft'));
