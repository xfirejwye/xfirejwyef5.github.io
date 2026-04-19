-- Videos table (anonymous uploads)
create table public.videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  uploader_name text,
  storage_path text not null,
  thumbnail_path text,
  mime_type text,
  size_bytes bigint,
  views bigint not null default 0,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create index videos_created_at_idx on public.videos (created_at desc);
create index videos_views_idx on public.videos (views desc);

alter table public.videos enable row level security;

create policy "Public can view visible videos"
on public.videos for select
using (is_hidden = false);

create policy "Anyone can upload videos"
on public.videos for insert
with check (true);

create table public.video_reports (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now()
);

create index video_reports_video_id_idx on public.video_reports (video_id);

alter table public.video_reports enable row level security;

create policy "Anyone can report"
on public.video_reports for insert
with check (true);

create or replace function public.increment_video_views(_video_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.videos set views = views + 1 where id = _video_id and is_hidden = false;
$$;

grant execute on function public.increment_video_views(uuid) to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'videos',
  'videos',
  true,
  524288000,
  array['video/mp4','video/webm','video/quicktime','video/x-matroska','video/ogg','video/avi','video/x-msvideo']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Public can read videos bucket"
on storage.objects for select
using (bucket_id = 'videos');

create policy "Anyone can upload to videos bucket"
on storage.objects for insert
with check (bucket_id = 'videos');