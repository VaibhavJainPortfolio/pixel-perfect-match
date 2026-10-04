ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_state text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_paise integer NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS failure_reason text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS orders_razorpay_order_id_key ON public.orders(razorpay_order_id) WHERE razorpay_order_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS orders_invoice_number_key ON public.orders(invoice_number) WHERE invoice_number IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS submissions_order_id_key ON public.submissions(order_id);

CREATE TABLE public.business_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  legal_name text NOT NULL DEFAULT 'TheGent''s (legal name to be added)',
  gstin text NOT NULL DEFAULT 'GSTIN to be added',
  address text NOT NULL DEFAULT 'Registered address to be added',
  state text NOT NULL DEFAULT 'Madhya Pradesh',
  state_code text NOT NULL DEFAULT '23',
  email text,
  phone text,
  sac_code text NOT NULL DEFAULT '998311',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.business_settings TO authenticated;
GRANT ALL ON public.business_settings TO service_role;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin read business settings" ON public.business_settings FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admin update business settings" ON public.business_settings FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER trg_business_settings_updated BEFORE UPDATE ON public.business_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
INSERT INTO public.business_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE TABLE public.invoice_counters (fy text PRIMARY KEY, last_value integer NOT NULL DEFAULT 0);
GRANT ALL ON public.invoice_counters TO service_role;
ALTER TABLE public.invoice_counters ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.next_invoice_number(_fy text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  INSERT INTO public.invoice_counters(fy, last_value) VALUES (_fy, 1)
  ON CONFLICT (fy) DO UPDATE SET last_value = invoice_counters.last_value + 1
  RETURNING last_value INTO n;
  RETURN 'TG/' || _fy || '/' || lpad(n::text, 5, '0');
END; $$;
REVOKE ALL ON FUNCTION public.next_invoice_number(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.next_invoice_number(text) TO service_role;

CREATE OR REPLACE FUNCTION public.increment_coupon_use(_code text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.coupons SET used_count = used_count + 1 WHERE code = _code;
$$;
REVOKE ALL ON FUNCTION public.increment_coupon_use(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_coupon_use(text) TO service_role;

CREATE TABLE public.payment_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.payment_events TO service_role;
GRANT SELECT ON public.payment_events TO authenticated;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin read payment events" ON public.payment_events FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));