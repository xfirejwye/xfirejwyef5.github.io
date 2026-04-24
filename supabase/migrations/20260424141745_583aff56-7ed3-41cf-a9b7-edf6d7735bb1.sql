-- Restore standard PostgREST grants. RLS policies still control row visibility.
GRANT SELECT ON public.videos TO anon, authenticated;
GRANT INSERT ON public.videos TO anon, authenticated;
GRANT UPDATE, DELETE ON public.videos TO authenticated;

-- Re-revoke the ip_address column from public roles so it stays admin-only.
REVOKE SELECT (ip_address) ON public.videos FROM anon, authenticated;

GRANT SELECT, INSERT ON public.video_comments TO anon, authenticated;
GRANT DELETE ON public.video_comments TO authenticated;
REVOKE SELECT (ip_address) ON public.video_comments FROM anon, authenticated;

GRANT SELECT, INSERT ON public.video_reports TO anon, authenticated;
GRANT DELETE ON public.video_reports TO authenticated;