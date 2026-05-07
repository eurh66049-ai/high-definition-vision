-- Secure daily_messages policies: restrict writes to service role only
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'daily_messages' 
      AND polname = 'System can manage daily messages'
  ) THEN
    DROP POLICY "System can manage daily messages" ON public.daily_messages;
  END IF;
END $$;

-- Allow service role to manage daily messages (insert/update/delete)
CREATE POLICY IF NOT EXISTS "Service role can manage daily messages"
ON public.daily_messages
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');