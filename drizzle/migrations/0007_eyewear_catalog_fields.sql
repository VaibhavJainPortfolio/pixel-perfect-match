ALTER TABLE public.products_catalog
  ADD COLUMN IF NOT EXISTS shape text,
  ADD COLUMN IF NOT EXISTS rim text,
  ADD COLUMN IF NOT EXISTS lens_width_mm numeric,
  ADD COLUMN IF NOT EXISTS bridge_mm numeric,
  ADD COLUMN IF NOT EXISTS temple_mm numeric,
  ADD COLUMN IF NOT EXISTS colour_hex text;
COMMENT ON COLUMN public.products_catalog.category IS 'Includes eyewear_frames and sunglasses';