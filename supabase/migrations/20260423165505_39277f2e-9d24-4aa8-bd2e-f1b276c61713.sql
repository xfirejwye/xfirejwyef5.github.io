
CREATE TABLE public.video_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  author_name text NOT NULL DEFAULT 'Anonymous',
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT video_comments_body_len CHECK (char_length(body) BETWEEN 1 AND 1000),
  CONSTRAINT video_comments_name_len CHECK (char_length(author_name) BETWEEN 1 AND 40)
);

CREATE INDEX idx_video_comments_video_created
  ON public.video_comments (video_id, created_at DESC);

ALTER TABLE public.video_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view comments on visible videos"
  ON public.video_comments
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.videos v
      WHERE v.id = video_comments.video_id AND v.is_hidden = false
    )
  );

CREATE POLICY "Anyone can post a comment"
  ON public.video_comments
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.videos v
      WHERE v.id = video_comments.video_id AND v.is_hidden = false
    )
  );

CREATE POLICY "Admins can delete comments"
  ON public.video_comments
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all comments"
  ON public.video_comments
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

ALTER PUBLICATION supabase_realtime ADD TABLE public.video_comments;
