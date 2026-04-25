-- Create likes table
CREATE TABLE public.video_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  ip_address inet NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (video_id, ip_address)
);

CREATE INDEX idx_video_likes_video ON public.video_likes(video_id);

ALTER TABLE public.video_likes ENABLE ROW LEVEL SECURITY;

-- Anyone can see likes (so we can show counts / liked-state)
CREATE POLICY "Public can view likes on visible videos"
ON public.video_likes
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.videos v
    WHERE v.id = video_likes.video_id AND v.is_hidden = false
  )
);

-- Admins can delete likes
CREATE POLICY "Admins can delete likes"
ON public.video_likes
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Server-side function to add a like using the request's IP
CREATE OR REPLACE FUNCTION public.like_video(_video_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  client_ip inet;
  total bigint;
BEGIN
  -- Make sure the video exists and is visible
  IF NOT EXISTS (SELECT 1 FROM public.videos WHERE id = _video_id AND is_hidden = false) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  -- Resolve IP from request headers
  BEGIN
    client_ip := COALESCE(
      NULLIF(split_part(current_setting('request.headers', true)::json->>'x-forwarded-for', ',', 1), ''),
      current_setting('request.headers', true)::json->>'cf-connecting-ip',
      current_setting('request.headers', true)::json->>'x-real-ip'
    )::inet;
  EXCEPTION WHEN OTHERS THEN
    client_ip := NULL;
  END;

  IF client_ip IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_ip');
  END IF;

  -- Block if IP is blacklisted from commenting (reuse the comment block)
  IF public.is_ip_blocked(client_ip, 'comment') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'blocked');
  END IF;

  INSERT INTO public.video_likes (video_id, ip_address)
  VALUES (_video_id, client_ip)
  ON CONFLICT (video_id, ip_address) DO NOTHING;

  SELECT count(*) INTO total FROM public.video_likes WHERE video_id = _video_id;

  RETURN jsonb_build_object('ok', true, 'count', total, 'liked', true);
END;
$$;

-- Helper to check if current IP has liked
CREATE OR REPLACE FUNCTION public.has_liked_video(_video_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  client_ip inet;
BEGIN
  BEGIN
    client_ip := COALESCE(
      NULLIF(split_part(current_setting('request.headers', true)::json->>'x-forwarded-for', ',', 1), ''),
      current_setting('request.headers', true)::json->>'cf-connecting-ip',
      current_setting('request.headers', true)::json->>'x-real-ip'
    )::inet;
  EXCEPTION WHEN OTHERS THEN
    RETURN false;
  END;

  IF client_ip IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.video_likes
    WHERE video_id = _video_id AND ip_address = client_ip
  );
END;
$$;
