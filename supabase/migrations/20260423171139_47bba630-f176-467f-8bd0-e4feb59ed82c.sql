
-- 1. Add ip_address columns
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS ip_address inet;
ALTER TABLE public.video_comments ADD COLUMN IF NOT EXISTS ip_address inet;

-- 2. Blacklist table
CREATE TABLE IF NOT EXISTS public.ip_blacklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip inet NOT NULL UNIQUE,
  block_uploads boolean NOT NULL DEFAULT true,
  block_comments boolean NOT NULL DEFAULT true,
  block_viewing boolean NOT NULL DEFAULT false,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ip_blacklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view blacklist"
  ON public.ip_blacklist FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert blacklist"
  ON public.ip_blacklist FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update blacklist"
  ON public.ip_blacklist FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete blacklist"
  ON public.ip_blacklist FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. Function for edge functions to check ban status (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_ip_blocked(_ip inet, _kind text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.ip_blacklist
    WHERE ip = _ip
      AND CASE _kind
        WHEN 'upload'  THEN block_uploads
        WHEN 'comment' THEN block_comments
        WHEN 'view'    THEN block_viewing
        ELSE false
      END
  );
$$;

-- 4. Public SELECT policies should NOT expose ip_address. The existing public SELECT
--    policies on videos / video_comments already select all columns, but RLS doesn't
--    do column-level filtering. We add a column-level GRANT restriction for anon/auth.
REVOKE SELECT ON public.video_comments FROM anon, authenticated;
GRANT SELECT (id, video_id, author_name, body, created_at) ON public.video_comments TO anon, authenticated;
GRANT SELECT ON public.video_comments TO service_role;

REVOKE SELECT ON public.videos FROM anon, authenticated;
GRANT SELECT (id, title, description, uploader_name, storage_path, thumbnail_path, mime_type, size_bytes, views, is_hidden, created_at) ON public.videos TO anon, authenticated;
GRANT SELECT ON public.videos TO service_role;

-- Admins go through a SECURITY DEFINER path (edge function or direct via service role).
-- For client-side admin UI, we'll create a view that admins can read fully.
CREATE OR REPLACE VIEW public.videos_admin AS
  SELECT v.*, host(v.ip_address) as ip_text FROM public.videos v;

CREATE OR REPLACE VIEW public.comments_admin AS
  SELECT c.*, host(c.ip_address) as ip_text FROM public.video_comments c;

-- Restrict views to admins via a security barrier function
ALTER VIEW public.videos_admin SET (security_invoker = true);
ALTER VIEW public.comments_admin SET (security_invoker = true);

-- Add admin-only SELECT policy that allows reading ip_address column
-- (column GRANTs above only restrict anon/authenticated; admins query via authenticated role too,
--  so we need a different approach: grant ip_address column to authenticated AND rely on RLS)
GRANT SELECT (ip_address) ON public.videos TO authenticated;
GRANT SELECT (ip_address) ON public.video_comments TO authenticated;

-- But anon shouldn't see it
REVOKE SELECT (ip_address) ON public.videos FROM anon;
REVOKE SELECT (ip_address) ON public.video_comments FROM anon;

-- Admins already have a "view all" RLS policy on videos. Add one for comments to allow admin SELECT on hidden videos too (existing public policy filters by is_hidden=false).
-- Already exists: "Admins can view all comments"

-- 5. Allow admins to DELETE comments (already exists) and add an UPDATE on comments? Not needed.

-- 6. Index for blacklist lookups
CREATE INDEX IF NOT EXISTS idx_ip_blacklist_ip ON public.ip_blacklist(ip);
CREATE INDEX IF NOT EXISTS idx_videos_ip ON public.videos(ip_address);
CREATE INDEX IF NOT EXISTS idx_comments_ip ON public.video_comments(ip_address);
