CREATE TABLE public.page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.page_views TO anon, authenticated;
GRANT ALL ON public.page_views TO service_role;
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can log a page view" ON public.page_views FOR INSERT TO anon, authenticated
  WITH CHECK (char_length(path) BETWEEN 1 AND 200);
CREATE INDEX page_views_created_idx ON public.page_views (created_at);

CREATE TABLE public.prompt_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  value jsonb NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.prompt_versions TO service_role;
ALTER TABLE public.prompt_versions ENABLE ROW LEVEL SECURITY;
CREATE INDEX prompt_versions_key_idx ON public.prompt_versions (key, created_at DESC);

CREATE TABLE public.ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  author_id uuid,
  body text NOT NULL,
  channel text NOT NULL DEFAULT 'note',
  delivery_status text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.ticket_messages TO service_role;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS refunded_paise integer NOT NULL DEFAULT 0;
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS grievance_officer_name text;
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS grievance_officer_email text;

CREATE OR REPLACE FUNCTION public.audit_row_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r jsonb := to_jsonb(COALESCE(NEW, OLD));
BEGIN
  IF auth.uid() IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  INSERT INTO public.audit_log (actor_id, action, entity, entity_id, before, after)
  VALUES (auth.uid(), lower(TG_OP), TG_TABLE_NAME, COALESCE(r->>'id', r->>'key', r->>'code'),
    CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END);
  RETURN COALESCE(NEW, OLD);
END; $$;

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['coupons','pricing','products_catalog','style_rules','site_content','reviews','business_settings','ai_settings'] LOOP
    EXECUTE format('CREATE TRIGGER trg_audit_%1$s AFTER INSERT OR UPDATE OR DELETE ON public.%1$I FOR EACH ROW EXECUTE FUNCTION public.audit_row_change()', t);
  END LOOP;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'pipeline_runs') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pipeline_runs;
  END IF;
END $$;