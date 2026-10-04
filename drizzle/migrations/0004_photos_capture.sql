CREATE UNIQUE INDEX IF NOT EXISTS photos_submission_slot_key ON public.photos(submission_id, slot);

CREATE OR REPLACE FUNCTION public.protect_photo_quality()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_staff(auth.uid()) THEN
    IF (TG_OP = 'INSERT' AND NEW.quality_status <> 'pending')
       OR (TG_OP = 'UPDATE' AND NEW.quality_status IS DISTINCT FROM OLD.quality_status AND NEW.quality_status <> 'pending') THEN
      RAISE EXCEPTION 'Photo quality is set by the checker only';
    END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_photos_protect_quality BEFORE INSERT OR UPDATE ON public.photos FOR EACH ROW EXECUTE FUNCTION public.protect_photo_quality();