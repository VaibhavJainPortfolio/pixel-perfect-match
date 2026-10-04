CREATE TYPE public.app_role AS ENUM ('customer','stylist','support','admin','super_admin');
CREATE TYPE public.profile_status AS ENUM ('active','suspended','deleted');
CREATE TYPE public.consent_type AS ENUM ('photo_processing','terms','privacy','marketing','ai_training');
CREATE TYPE public.product_type AS ENUM ('style_report','style_report_plus','occasion_pack');
CREATE TYPE public.order_status AS ENUM ('created','paid','intake','processing','review','delivered','failed','refunded','cancelled');
CREATE TYPE public.submission_status AS ENUM ('draft','photos_pending','submitted');
CREATE TYPE public.photo_slot AS ENUM ('face_front','face_left','face_right','face_45','body_front','body_side','wrist','outfit');
CREATE TYPE public.quality_status AS ENUM ('pending','passed','failed');
CREATE TYPE public.run_status AS ENUM ('queued','running','waiting_review','completed','failed');
CREATE TYPE public.step_key AS ENUM ('photo_qa','measurements','face_hair','body','skin','eyewear','stylist','renders','review','report_build','pdf','delivery');
CREATE TYPE public.step_status AS ENUM ('pending','running','succeeded','failed','skipped');
CREATE TYPE public.review_status AS ENUM ('open','in_progress','approved','changes_requested');
CREATE TYPE public.rule_category AS ENUM ('face_shape','body_type','skin_season','hair','beard','occasion');
CREATE TYPE public.discount_type AS ENUM ('percent','flat');
CREATE TYPE public.notification_channel AS ENUM ('whatsapp','email');

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id,'admin') OR public.has_role(_user_id,'super_admin')
$$;
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('stylist','support','admin','super_admin'))
$$;

CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins read all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Super admin manages all roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "Admin manages non-super roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') AND role <> 'super_admin')
  WITH CHECK (public.has_role(auth.uid(),'admin') AND role <> 'super_admin');
CREATE TRIGGER trg_user_roles_updated BEFORE UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  full_name text, phone text, email text, city text,
  age int, height_cm numeric, weight_kg numeric, budget_band text,
  marketing_opt_in boolean NOT NULL DEFAULT false,
  whatsapp_opt_in boolean NOT NULL DEFAULT false,
  status public.profile_status NOT NULL DEFAULT 'active',
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_phone ON public.profiles(phone);
CREATE INDEX idx_profiles_status ON public.profiles(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own profile read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Support/admin read profiles" ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'support') OR public.is_admin(auth.uid()));
CREATE POLICY "Admin manage profiles" ON public.profiles FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.protect_profile_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND auth.uid() IS NOT NULL AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not allowed to change status';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_profiles_protect BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_profile_status();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', NEW.phone)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  consent_type public.consent_type NOT NULL,
  version text NOT NULL,
  granted boolean NOT NULL,
  ip text, user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_consents_user ON public.consents(user_id, consent_type);
GRANT SELECT, INSERT ON public.consents TO authenticated;
GRANT ALL ON public.consents TO service_role;
ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own consents read" ON public.consents FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Own consents insert" ON public.consents FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admin read consents" ON public.consents FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER trg_consents_updated BEFORE UPDATE ON public.consents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product public.product_type NOT NULL DEFAULT 'style_report',
  amount_paise int NOT NULL,
  gst_paise int NOT NULL DEFAULT 0,
  total_paise int NOT NULL,
  coupon_code text,
  status public.order_status NOT NULL DEFAULT 'created',
  razorpay_order_id text, razorpay_payment_id text,
  invoice_number text UNIQUE, invoice_url text,
  paid_at timestamptz, delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_orders_user ON public.orders(user_id, created_at DESC);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE UNIQUE INDEX idx_orders_rzp_order ON public.orders(razorpay_order_id) WHERE razorpay_order_id IS NOT NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own orders read" ON public.orders FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Own orders create" ON public.orders FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status = 'created');
CREATE POLICY "Staff read orders" ON public.orders FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admin manage orders" ON public.orders FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  basics jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.submission_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_submissions_order ON public.submissions(order_id);
CREATE INDEX idx_submissions_user ON public.submissions(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.submissions TO authenticated;
GRANT ALL ON public.submissions TO service_role;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own submissions" ON public.submissions FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Stylist read submissions" ON public.submissions FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'stylist'));
CREATE POLICY "Admin manage submissions" ON public.submissions FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER trg_submissions_updated BEFORE UPDATE ON public.submissions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  slot public.photo_slot NOT NULL,
  storage_path text NOT NULL,
  quality_status public.quality_status NOT NULL DEFAULT 'pending',
  quality_feedback text,
  landmarks jsonb,
  width int, height int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_photos_submission ON public.photos(submission_id, slot);
CREATE INDEX idx_photos_user ON public.photos(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.photos TO authenticated;
GRANT ALL ON public.photos TO service_role;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own photos" ON public.photos FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Stylist read photos" ON public.photos FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'stylist'));
CREATE POLICY "Admin manage photos" ON public.photos FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER trg_photos_updated BEFORE UPDATE ON public.photos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.pipeline_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status public.run_status NOT NULL DEFAULT 'queued',
  current_step public.step_key,
  started_at timestamptz, finished_at timestamptz,
  total_cost_usd numeric(10,4) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_runs_order ON public.pipeline_runs(order_id);
CREATE INDEX idx_runs_status ON public.pipeline_runs(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pipeline_runs TO authenticated;
GRANT ALL ON public.pipeline_runs TO service_role;
ALTER TABLE public.pipeline_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Stylist read runs" ON public.pipeline_runs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'stylist'));
CREATE POLICY "Admin manage runs" ON public.pipeline_runs FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER trg_runs_updated BEFORE UPDATE ON public.pipeline_runs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.pipeline_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.pipeline_runs(id) ON DELETE CASCADE,
  step_key public.step_key NOT NULL,
  status public.step_status NOT NULL DEFAULT 'pending',
  attempt int NOT NULL DEFAULT 1,
  input jsonb, output jsonb, error text,
  model_used text, tokens_in int, tokens_out int,
  cost_usd numeric(10,4) NOT NULL DEFAULT 0,
  started_at timestamptz, finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_steps_run ON public.pipeline_steps(run_id, step_key);
CREATE INDEX idx_steps_status ON public.pipeline_steps(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pipeline_steps TO authenticated;
GRANT ALL ON public.pipeline_steps TO service_role;
ALTER TABLE public.pipeline_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage steps" ON public.pipeline_steps FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER trg_steps_updated BEFORE UPDATE ON public.pipeline_steps FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.renders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  look_key text NOT NULL,
  prompt text, storage_path text, provider text, model text,
  status text NOT NULL DEFAULT 'pending',
  approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_renders_order ON public.renders(order_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.renders TO authenticated;
GRANT ALL ON public.renders TO service_role;
ALTER TABLE public.renders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own approved renders read" ON public.renders FOR SELECT TO authenticated
  USING (approved AND EXISTS (SELECT 1 FROM public.orders o WHERE o.id = renders.order_id AND o.user_id = auth.uid()));
CREATE POLICY "Stylist/admin manage renders" ON public.renders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'stylist') OR public.is_admin(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'stylist') OR public.is_admin(auth.uid()));
CREATE TRIGGER trg_renders_updated BEFORE UPDATE ON public.renders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  share_token text UNIQUE DEFAULT replace(gen_random_uuid()::text,'-',''),
  pdf_path text,
  version int NOT NULL DEFAULT 1,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_reports_user ON public.reports(user_id);
CREATE INDEX idx_reports_order ON public.reports(order_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own published reports read" ON public.reports FOR SELECT TO authenticated USING (user_id = auth.uid() AND published_at IS NOT NULL);
CREATE POLICY "Stylist/admin manage reports" ON public.reports FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'stylist') OR public.is_admin(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'stylist') OR public.is_admin(auth.uid()));
CREATE TRIGGER trg_reports_updated BEFORE UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.review_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  reason text, assigned_to uuid,
  status public.review_status NOT NULL DEFAULT 'open',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_review_status ON public.review_tasks(status, created_at);
CREATE INDEX idx_review_assigned ON public.review_tasks(assigned_to);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_tasks TO authenticated;
GRANT ALL ON public.review_tasks TO service_role;
ALTER TABLE public.review_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Stylist/admin manage reviews" ON public.review_tasks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'stylist') OR public.is_admin(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'stylist') OR public.is_admin(auth.uid()));
CREATE TRIGGER trg_review_updated BEFORE UPDATE ON public.review_tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.products_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL, name text NOT NULL, brand text, colour text, fit_notes text,
  price_min int, price_max int, url text, affiliate_url text, image_url text,
  tags text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_catalog_category ON public.products_catalog(category) WHERE active;
CREATE INDEX idx_catalog_tags ON public.products_catalog USING gin(tags);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products_catalog TO authenticated;
GRANT ALL ON public.products_catalog TO service_role;
ALTER TABLE public.products_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Stylist read catalog" ON public.products_catalog FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'stylist'));
CREATE POLICY "Admin manage catalog" ON public.products_catalog FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER trg_catalog_updated BEFORE UPDATE ON public.products_catalog FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.style_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category public.rule_category NOT NULL,
  condition_key text NOT NULL,
  rule_text text NOT NULL,
  priority int NOT NULL DEFAULT 100,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_rules_lookup ON public.style_rules(category, condition_key) WHERE active;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.style_rules TO authenticated;
GRANT ALL ON public.style_rules TO service_role;
ALTER TABLE public.style_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage rules" ON public.style_rules FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER trg_rules_updated BEFORE UPDATE ON public.style_rules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.ai_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_settings TO authenticated;
GRANT ALL ON public.ai_settings TO service_role;
ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage ai settings" ON public.ai_settings FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER trg_ai_settings_updated BEFORE UPDATE ON public.ai_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
INSERT INTO public.ai_settings (key, value) VALUES
  ('analysis_model', '"claude-sonnet-5-5"'),
  ('stylist_model', '"claude-opus-5-5"'),
  ('reviewer_model', '"claude-sonnet-5-5"'),
  ('image_provider', '"openai"'),
  ('image_model', '""'),
  ('renders_per_report', '4');

CREATE TABLE public.coupons (
  code text PRIMARY KEY,
  discount_type public.discount_type NOT NULL,
  value int NOT NULL,
  max_uses int, used_count int NOT NULL DEFAULT 0,
  valid_from timestamptz, valid_to timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_coupons_active ON public.coupons(active);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage coupons" ON public.coupons FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER trg_coupons_updated BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  channel public.notification_channel NOT NULL,
  template text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  payload jsonb,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_order ON public.notifications(order_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Support read notifications" ON public.notifications FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'support'));
CREATE POLICY "Admin manage notifications" ON public.notifications FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER trg_notifications_updated BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL, entity text NOT NULL, entity_id text,
  before jsonb, after jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_entity ON public.audit_log(entity, entity_id);
CREATE INDEX idx_audit_created ON public.audit_log(created_at DESC);
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin read audit" ON public.audit_log FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admin insert audit" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()) AND actor_id = auth.uid());

CREATE POLICY "Own photos objects" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'photos' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Own read renders/reports/invoices" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id IN ('renders','reports','invoices') AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Stylist read photos/renders/reports" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id IN ('photos','renders','reports') AND public.has_role(auth.uid(),'stylist'));
CREATE POLICY "Admin manage all private objects" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id IN ('photos','renders','reports','invoices') AND public.is_admin(auth.uid()))
  WITH CHECK (bucket_id IN ('photos','renders','reports','invoices') AND public.is_admin(auth.uid()));
