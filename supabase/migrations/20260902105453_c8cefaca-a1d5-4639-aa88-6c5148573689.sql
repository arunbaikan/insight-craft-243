ALTER TABLE public.metric_definition_versions
  ADD COLUMN IF NOT EXISTS actor text NOT NULL DEFAULT 'demo-user',
  ADD COLUMN IF NOT EXISTS change_note text,
  ADD COLUMN IF NOT EXISTS changed_fields jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS metric_definition_versions_metric_idx
  ON public.metric_definition_versions (metric_id, version DESC);