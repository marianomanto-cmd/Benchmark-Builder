-- Ingestion pipeline: research params, scraping targets, real-source mention
-- fields with dedup, run lifecycle and per-source breakdown.

alter table projects
  add column keywords text[] not null default '{}',
  add column geo text[] not null default '{}',
  add column languages text[] not null default array['es','en']::text[];

alter table competitors
  add column targets text[] not null default '{}';

alter table mentions
  add column external_id text,
  add column url text,
  add column published_at timestamptz,
  add column engagement jsonb not null default '{}'::jsonb,
  add column run_id uuid references runs(id) on delete set null;

alter table runs
  add column started_at timestamptz,
  add column finished_at timestamptz,
  add column mentions_count int not null default 0,
  add column error text;

alter table insights
  add column run_id uuid references runs(id) on delete set null;

create table run_sources (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references runs(id) on delete cascade,
  platform platform not null,
  status text not null default 'pending',
  mentions_count int not null default 0,
  cost numeric(10,4) not null default 0,
  error text,
  created_at timestamptz not null default now()
);
create index on run_sources(run_id);
alter table run_sources enable row level security;
create policy "public read" on run_sources for select using (true);
