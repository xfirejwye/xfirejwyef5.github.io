-- 1. User roles system
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. Admin policies on videos and reports
CREATE POLICY "Admins can view all videos"
  ON public.videos FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update videos"
  ON public.videos FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete videos"
  ON public.videos FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view reports"
  ON public.video_reports FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete reports"
  ON public.video_reports FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. Rate limiting: track upload attempts by IP
CREATE TABLE public.upload_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash TEXT NOT NULL,
  video_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_upload_attempts_ip_time ON public.upload_attempts (ip_hash, created_at DESC);

ALTER TABLE public.upload_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view upload attempts"
  ON public.upload_attempts FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4. Rate-limit RPC: callable from anon, returns allowed/remaining
CREATE OR REPLACE FUNCTION public.check_upload_rate_limit(_ip_hash TEXT)
RETURNS JSONB
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hourly_count INT;
  daily_count INT;
  last_attempt TIMESTAMPTZ;
  seconds_since_last INT;
BEGIN
  IF _ip_hash IS NULL OR length(_ip_hash) < 8 THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'invalid_client');
  END IF;

  SELECT COUNT(*) INTO hourly_count
  FROM public.upload_attempts
  WHERE ip_hash = _ip_hash AND created_at > now() - INTERVAL '1 hour';

  SELECT COUNT(*) INTO daily_count
  FROM public.upload_attempts
  WHERE ip_hash = _ip_hash AND created_at > now() - INTERVAL '24 hours';

  SELECT MAX(created_at) INTO last_attempt
  FROM public.upload_attempts
  WHERE ip_hash = _ip_hash;

  IF last_attempt IS NOT NULL THEN
    seconds_since_last := EXTRACT(EPOCH FROM (now() - last_attempt))::INT;
    IF seconds_since_last < 30 THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'too_fast', 'wait_seconds', 30 - seconds_since_last);
    END IF;
  END IF;

  IF hourly_count >= 3 THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'hourly_limit', 'limit', 3);
  END IF;

  IF daily_count >= 10 THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'daily_limit', 'limit', 10);
  END IF;

  INSERT INTO public.upload_attempts (ip_hash) VALUES (_ip_hash);

  RETURN jsonb_build_object('allowed', true, 'hourly_remaining', 3 - hourly_count - 1, 'daily_remaining', 10 - daily_count - 1);
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_upload_rate_limit(TEXT) TO anon, authenticated;