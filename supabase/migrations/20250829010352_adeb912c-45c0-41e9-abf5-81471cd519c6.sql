-- Secure daily_messages policies: restrict writes to service role only
DROP POLICY IF EXISTS "System can manage daily messages" ON public.daily_messages;

-- Allow service role to manage daily messages (insert/update/delete)
CREATE POLICY "Service role can manage daily messages"
ON public.daily_messages
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');