ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS is_short boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS duration_seconds numeric;

CREATE INDEX IF NOT EXISTS idx_videos_is_short ON public.videos (is_short) WHERE is_hidden = false;