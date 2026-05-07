CREATE POLICY "Anyone can view reading history for library"
ON public.reading_history
FOR SELECT
USING (true);