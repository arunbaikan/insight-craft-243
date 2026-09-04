CREATE TABLE public.plan_facts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scenario_id text NOT NULL,
  scenario_name text NOT NULL,
  series text NOT NULL,
  month_date date NOT NULL,
  month_key text NOT NULL,
  line_key text NOT NULL,
  line_label text NOT NULL,
  category text NOT NULL,
  amount_base numeric NOT NULL DEFAULT 0,
  published_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX plan_facts_month_idx ON public.plan_facts (month_date);
CREATE INDEX plan_facts_lookup_idx ON public.plan_facts (series, line_key);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_facts TO anon, authenticated;
GRANT ALL ON public.plan_facts TO service_role;

ALTER TABLE public.plan_facts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "demo workspace full access" ON public.plan_facts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);