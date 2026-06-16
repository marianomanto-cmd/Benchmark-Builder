-- White-label branding (agency puts its own logo/name/accent and can hide the
-- "Generado con Phatia" footer, gated by plan). One row per account; until real
-- auth lands it's a workspace singleton (account_id null), written via the
-- service role. Logo lives in the public "branding" Storage bucket.
create table if not exists workspace_branding (
  id uuid primary key default gen_random_uuid(),
  account_id uuid,
  brand_name text,
  logo_url text,
  accent_hex text,
  hide_phatia_footer boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table workspace_branding enable row level security;
-- Branding is read by the (public) report + share link, so allow public read.
-- Writes are server-side via the service role. TODO(auth): scope by owner.
create policy "public read" on workspace_branding for select using (true);

-- Public bucket for uploaded logos (objects written via the service role).
insert into storage.buckets (id, name, public) values ('branding', 'branding', true) on conflict (id) do nothing;
