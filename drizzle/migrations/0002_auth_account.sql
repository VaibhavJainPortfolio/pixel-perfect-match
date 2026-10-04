ALTER TYPE public.consent_type ADD VALUE IF NOT EXISTS 'whatsapp';
ALTER TYPE public.consent_type ADD VALUE IF NOT EXISTS 'email';
ALTER TYPE public.consent_type ADD VALUE IF NOT EXISTS 'age_18';

CREATE OR REPLACE FUNCTION public.my_sessions()
RETURNS TABLE(id uuid, created_at timestamptz, updated_at timestamptz, user_agent text, ip text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.id, s.created_at, s.updated_at, s.user_agent, host(s.ip)::text
  FROM auth.sessions s WHERE s.user_id = auth.uid() ORDER BY s.updated_at DESC NULLS LAST
$$;
REVOKE ALL ON FUNCTION public.my_sessions() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.my_sessions() TO authenticated;