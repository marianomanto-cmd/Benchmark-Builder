-- Provenance / "click al dato": link each mention to the competitor it's about
-- and to the insights it supports, so every key number/insight opens its real
-- evidence (the verifiable differentiator). The DEMO provenance is in-memory
-- (lib/demo-cases mentions, filtered by components/evidence-drawer.tsx); these
-- columns/table back the live (DB) path.
alter table mentions add column if not exists competitor_id uuid references competitors(id) on delete set null;
create index if not exists mentions_competitor_idx on mentions (competitor_id);

create table if not exists insight_sources (
  insight_id uuid not null references insights(id) on delete cascade,
  mention_id uuid not null references mentions(id) on delete cascade,
  primary key (insight_id, mention_id)
);

alter table insight_sources enable row level security;
create policy "public read" on insight_sources for select using (true);

-- TODO(seed): populate mentions.competitor_id + insight_sources in
-- supabase/seed.sql when seeding the DB for live; demo runs on in-memory data.
