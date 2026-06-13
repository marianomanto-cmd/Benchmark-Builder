-- Benchmark Builder — initial schema.
-- Applied to the Supabase project "Benchmark Builder" (wjexqyliwwsxjdujgwjo).

-- Enums
create type platform as enum ('instagram','tiktok','youtube','facebook','x','reddit','mastodon','bluesky','web','meta_ads');
create type sentiment_kind as enum ('pos','neu','neg','mix');
create type insight_kind as enum ('opp','thr','pat','ano');
create type thumb_kind as enum ('photo','video','article','ad');
create type project_status as enum ('active','draft','archived');

create table workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  brand_color text not null default '#6b1a36',
  created_at timestamptz not null default now()
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  slug text unique not null,
  period_days int not null default 60,
  status project_status not null default 'active',
  created_at timestamptz not null default now()
);
create index on projects(workspace_id);

create table competitors (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  handle text not null,
  brand_letter text not null,
  accent text not null,
  is_client boolean not null default false,
  mentions int not null default 0,
  engagement_total text,
  reach_estimate text,
  sov numeric(5,1) not null default 0,
  sentiment sentiment_kind not null default 'neu',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (project_id, handle)
);
create index on competitors(project_id);

create table competitor_platforms (
  competitor_id uuid not null references competitors(id) on delete cascade,
  platform platform not null,
  sort_order int not null default 0,
  primary key (competitor_id, platform)
);

create table mentions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  competitor_id uuid references competitors(id) on delete set null,
  platform platform not null,
  author text not null,
  handle text not null,
  ts_label text not null,
  brand text not null,
  body text not null,
  sentiment sentiment_kind not null,
  is_ad boolean not null default false,
  thumb_type thumb_kind,
  permalink text,
  metrics jsonb not null default '[]'::jsonb,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index on mentions(project_id);

create table insights (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  kind insight_kind not null,
  title text not null,
  body text,
  sources int not null default 0,
  confidence numeric(3,2) not null default 0,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index on insights(project_id);

create table runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  number int not null,
  cost_used numeric(10,2) not null default 0,
  cost_soft numeric(10,2) not null default 50,
  cost_hard numeric(10,2) not null default 75,
  status text not null default 'done',
  created_at timestamptz not null default now()
);
create index on runs(project_id);

-- RLS: enabled with public read for now. Writes require the service role.
-- Auth/tenancy model is intentionally still open (HANDOFF §10); tighten later.
alter table workspaces enable row level security;
alter table projects enable row level security;
alter table competitors enable row level security;
alter table competitor_platforms enable row level security;
alter table mentions enable row level security;
alter table insights enable row level security;
alter table runs enable row level security;

create policy "public read" on workspaces for select using (true);
create policy "public read" on projects for select using (true);
create policy "public read" on competitors for select using (true);
create policy "public read" on competitor_platforms for select using (true);
create policy "public read" on mentions for select using (true);
create policy "public read" on insights for select using (true);
create policy "public read" on runs for select using (true);
