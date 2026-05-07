
-- Drop the restrictive policies
DROP POLICY IF EXISTS "Users can view their own reading history" ON public.reading_history;
DROP POLICY IF EXISTS "Anyone can view reading history for library" ON public.reading_history;
DROP POLICY IF EXISTS "Users can insert their own reading history" ON public.reading_history;
DROP POLICY IF EXISTS "Users can update their own reading history" ON public.reading_history;
DROP POLICY IF EXISTS "Users can delete their own reading history" ON public.reading_history;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Users can view their own reading history"
ON public.reading_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view reading history for library"
ON public.reading_history FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own reading history"
ON public.reading_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reading history"
ON public.reading_history FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reading history"
ON public.reading_history FOR DELETE
USING (auth.uid() = user_id);
