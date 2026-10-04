CREATE TABLE public.site_content (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_content TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_content TO authenticated;
GRANT ALL ON public.site_content TO service_role;
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read site content" ON public.site_content FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin manage site content" ON public.site_content FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER trg_site_content_updated BEFORE UPDATE ON public.site_content FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
INSERT INTO public.site_content (key, value) VALUES
  ('before_after', '{"before_url": "", "after_url": "", "before_label": "Before", "after_label": "AI render of the same man"}');

CREATE TABLE public.pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product public.product_type NOT NULL UNIQUE,
  name text NOT NULL,
  tagline text,
  amount_paise int NOT NULL,
  gst_rate numeric(5,2) NOT NULL DEFAULT 18,
  features text[] NOT NULL DEFAULT '{}',
  highlighted boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pricing_active ON public.pricing(active, sort_order);
GRANT SELECT ON public.pricing TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.pricing TO authenticated;
GRANT ALL ON public.pricing TO service_role;
ALTER TABLE public.pricing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active pricing" ON public.pricing FOR SELECT TO anon, authenticated USING (active);
CREATE POLICY "Admin manage pricing" ON public.pricing FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER trg_pricing_updated BEFORE UPDATE ON public.pricing FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
INSERT INTO public.pricing (product, name, tagline, amount_paise, features, highlighted, sort_order) VALUES
  ('style_report', 'Style Report', 'The full personal analysis', 199900, ARRAY['Face shape, body type and skin tone','Hairstyle and beard advice','16 outfits with 4 AI images of you','Accessories, watches and fragrance','90-day plan, web + PDF'], true, 1),
  ('style_report_plus', 'Style Report Plus', 'More renders and a stylist review', 349900, ARRAY['Everything in Style Report','12 AI images of you','Human stylist review','One round of revisions'], false, 2),
  ('occasion_pack', 'Occasion Pack', 'Add-on for a wedding, interview or date', 69900, ARRAY['3 outfits for one occasion','2 AI images of you','Requires a Style Report'], false, 3);

CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  display_name text NOT NULL,
  city text,
  rating int NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  body text NOT NULL,
  approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_reviews_approved ON public.reviews(approved, created_at DESC);
GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read approved reviews" ON public.reviews FOR SELECT TO anon, authenticated USING (approved);
CREATE POLICY "Users submit own review" ON public.reviews FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND approved = false);
CREATE POLICY "Admin manage reviews" ON public.reviews FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER trg_reviews_updated BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL CHECK (char_length(first_name) BETWEEN 1 AND 60),
  whatsapp text NOT NULL CHECK (whatsapp ~ '^\+?[0-9]{10,13}$'),
  source text NOT NULL DEFAULT 'free_check' CHECK (source IN ('free_check')),
  face_shape text CHECK (face_shape IS NULL OR face_shape IN ('oval','round','square','oblong','heart','diamond')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_leads_created ON public.leads(created_at DESC);
CREATE INDEX idx_leads_whatsapp ON public.leads(whatsapp);
GRANT INSERT ON public.leads TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit a lead" ON public.leads FOR INSERT TO anon, authenticated WITH CHECK (source = 'free_check');
CREATE POLICY "Support/admin read leads" ON public.leads FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'support') OR public.is_admin(auth.uid()));
CREATE POLICY "Admin manage leads" ON public.leads FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER trg_leads_updated BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Free-check hair tips are public; everything else in style_rules stays admin-only
GRANT SELECT ON public.style_rules TO anon;
CREATE POLICY "Public read free-check hair tips" ON public.style_rules FOR SELECT TO anon, authenticated
  USING (active AND category = 'hair' AND condition_key LIKE 'face:%');
INSERT INTO public.style_rules (category, condition_key, rule_text, priority) VALUES
 ('hair','face:oval','Most cuts work for you — a classic side part or textured quiff keeps the balance.',1),
 ('hair','face:oval','Keep the forehead partly visible; heavy fringes hide your best proportion.',2),
 ('hair','face:oval','Medium length on top with tapered sides is the safest everyday choice.',3),
 ('hair','face:round','Add height on top — a pompadour or quiff makes the face look longer.',1),
 ('hair','face:round','Keep the sides short or faded to avoid extra width.',2),
 ('hair','face:round','Avoid blunt fringes and centre parts that emphasise roundness.',3),
 ('hair','face:square','Soften strong angles with some texture or a side-swept crop.',1),
 ('hair','face:square','Short classic cuts like a crew cut suit a defined jaw well.',2),
 ('hair','face:square','Avoid very boxy, flat tops that repeat the square outline.',3),
 ('hair','face:oblong','Avoid too much height on top; it makes the face look longer.',1),
 ('hair','face:oblong','A fringe or forward-styled crop shortens the face visually.',2),
 ('hair','face:oblong','Keep some fullness at the sides rather than a tight skin fade.',3),
 ('hair','face:heart','Medium-length styles with volume at the sides balance a narrower chin.',1),
 ('hair','face:heart','A light fringe or side-swept top softens a wider forehead.',2),
 ('hair','face:heart','A short beard can add width at the jaw.',3),
 ('hair','face:diamond','Keep some fullness at the forehead and chin to balance cheekbones.',1),
 ('hair','face:diamond','A textured fringe or side part works better than slicked-back hair.',2),
 ('hair','face:diamond','Avoid very short sides that exaggerate cheekbone width.',3);
