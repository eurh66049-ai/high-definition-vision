
CREATE TABLE public.monthly_report_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  report_month INTEGER NOT NULL,
  report_year INTEGER NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, report_month, report_year)
);

ALTER TABLE public.monthly_report_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own report logs"
  ON public.monthly_report_log
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own report logs"
  ON public.monthly_report_log
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
