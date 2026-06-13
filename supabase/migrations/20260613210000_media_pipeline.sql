-- Media pipeline (Task 2): downloaded media + their AI analysis
-- (image / video / voiceover). Idempotent. Public read; writes via service role.

create table if not exists public.media_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  run_id uuid references public.runs(id) on delete set null,
  mention_id uuid references public.mentions(id) on delete cascade,
  url text not null,
  kind text not null check (kind in ('image','video','audio')),
  status text not null default 'pending' check (status in ('pending','downloaded','analyzed','failed','expired')),
  storage_path text,
  bytes bigint,
  duration_s numeric,
  width int,
  height int,
  expires_at timestamptz,            -- download time + 12h; swept by cron
  created_at timestamptz not null default now()
);
create unique index if not exists media_files_project_url_uniq on public.media_files (project_id, url);
create index if not exists media_files_run_idx on public.media_files (run_id);
create index if not exists media_files_status_idx on public.media_files (status);
create index if not exists media_files_expires_idx on public.media_files (expires_at);

create table if not exists public.media_analysis (
  id uuid primary key default gen_random_uuid(),
  media_file_id uuid not null references public.media_files(id) on delete cascade,
  kind text not null,                -- image | video
  summary text,                      -- what the media SHOWS (consolidated)
  shows jsonb not null default '[]'::jsonb,   -- detected objects / labels / scene
  ocr_text text,                     -- text detected in the image / frames
  transcript text,                   -- what the voiceover SAYS
  language text,
  sentiment text,                    -- pos | neu | neg | mix
  brand_safety text,                 -- safe | review | unsafe
  topics jsonb not null default '[]'::jsonb,
  model text,                        -- e.g. claude-opus-4-8 + whisper-1
  cost_usd numeric not null default 0,
  raw jsonb,
  created_at timestamptz not null default now()
);
create unique index if not exists media_analysis_file_uniq on public.media_analysis (media_file_id);

alter table public.media_files enable row level security;
alter table public.media_analysis enable row level security;

do $$ begin
  create policy "media_files public read" on public.media_files for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "media_analysis public read" on public.media_analysis for select using (true);
exception when duplicate_object then null; end $$;
