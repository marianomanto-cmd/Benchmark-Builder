-- Persisted, versioned, shareable reports. Writes go through the service role
-- (server routes in app/api/reports) since the app has no real Supabase Auth yet;
-- the only public access is a read-only share link gated by is_public (the token
-- is matched in the query). The editor keeps working via the seed fallback in
-- lib/reports.ts until this migration is applied.
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete set null,
  run_number int,
  title text not null default '',
  subtitle text not null default '',
  doc jsonb not null default '{}'::jsonb,
  share_token text unique,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Append-only version history (manual saves + restores snapshot here).
create table if not exists report_versions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references reports(id) on delete cascade,
  doc jsonb not null,
  label text,
  created_at timestamptz not null default now()
);

create index if not exists reports_share_token_idx on reports (share_token);
create index if not exists report_versions_report_idx on report_versions (report_id, created_at desc);

alter table reports enable row level security;
alter table report_versions enable row level security;

-- Public read ONLY for shared reports (anon, matched by share_token in the query).
-- report_versions has no public policy → only the service role can read it.
-- All writes (both tables) are server-side via the service role, which bypasses RLS.
-- TODO(auth): when real Supabase Auth lands, add owner_id + "owner edits" policies.
create policy "public read shared" on reports for select using (is_public = true);
