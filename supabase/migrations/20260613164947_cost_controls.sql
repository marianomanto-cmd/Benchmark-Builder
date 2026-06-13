-- Cost controls: budgets, kill switch, ledger, atomic reservations and run timeline.
-- Idempotent — safe to re-run. Already applied to the remote DB; this file keeps
-- the schema under version control.

-- ---- Budget columns ---------------------------------------------------------
alter table projects   add column if not exists budget_monthly_usd numeric not null default 100;
alter table runs       add column if not exists budget_usd          numeric not null default 30;
alter table runs       add column if not exists cost_estimated_low  numeric;
alter table runs       add column if not exists cost_estimated_high numeric;
alter table runs       add column if not exists cost_actual         numeric;
alter table workspaces add column if not exists settings            jsonb   not null default '{}'::jsonb;

-- ---- Kill switch / feature flags -------------------------------------------
create table if not exists system_flags (
  key        text primary key,
  value      jsonb not null default 'false'::jsonb,
  updated_at timestamptz not null default now()
);

insert into system_flags (key, value) values
  ('external_apis_enabled', 'true'::jsonb),
  ('apify_enabled',         'true'::jsonb),
  ('anthropic_enabled',     'true'::jsonb),
  ('openai_enabled',        'true'::jsonb),
  ('brave_enabled',         'true'::jsonb),
  ('xai_enabled',           'true'::jsonb)
on conflict (key) do nothing;

-- ---- Cost ledger (committed spend) -----------------------------------------
create table if not exists cost_ledger (
  id             uuid primary key default gen_random_uuid(),
  run_id         uuid references runs(id) on delete set null,
  project_id     uuid references projects(id) on delete set null,
  workspace_id   uuid references workspaces(id) on delete set null,
  provider       text not null,
  operation      text not null,
  cost_usd       numeric not null default 0,
  units          numeric not null default 0,
  unit_type      text,
  reservation_id uuid,
  metadata       jsonb not null default '{}'::jsonb,
  occurred_at    timestamptz not null default now()
);
create index if not exists cost_ledger_run_idx       on cost_ledger(run_id);
create index if not exists cost_ledger_project_idx   on cost_ledger(project_id, occurred_at);
create index if not exists cost_ledger_workspace_idx on cost_ledger(workspace_id, occurred_at);

-- ---- Pending charges (reservations) ----------------------------------------
create table if not exists pending_charges (
  id                 uuid primary key default gen_random_uuid(),
  run_id             uuid references runs(id) on delete cascade,
  project_id         uuid references projects(id) on delete set null,
  workspace_id       uuid references workspaces(id) on delete set null,
  provider           text not null,
  operation          text not null,
  estimated_cost_usd numeric not null default 0,
  status             text not null default 'reserved'
                     check (status in ('reserved','committed','released','expired')),
  reserved_at        timestamptz not null default now(),
  expires_at         timestamptz not null
);
create index if not exists pending_charges_run_idx    on pending_charges(run_id, status);
create index if not exists pending_charges_status_idx on pending_charges(status, expires_at);

-- ---- Run timeline (live cost meter) ----------------------------------------
create table if not exists run_steps (
  id             uuid primary key default gen_random_uuid(),
  run_id         uuid not null references runs(id) on delete cascade,
  label          text not null,
  provider       text,
  cost_usd       numeric not null default 0,
  cumulative_usd numeric not null default 0,
  metadata       jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);
create index if not exists run_steps_run_idx on run_steps(run_id, created_at);

-- ---- Budget helpers ---------------------------------------------------------
create or replace function budget_spent_with_pending(p_run_id uuid)
returns numeric language sql stable as $$
  select coalesce((select sum(cost_usd) from cost_ledger where run_id = p_run_id),0)
       + coalesce((select sum(estimated_cost_usd) from pending_charges
                   where run_id = p_run_id and status='reserved'),0);
$$;

-- Atomic reservation. Serializes per run with an advisory xact lock (FM-05),
-- then checks run, project (monthly) and workspace (monthly) caps. Returns a
-- jsonb verdict: ok | soft (≥80% of run budget) | hard (would exceed) | error.
create or replace function reserve_budget(
  p_run_id uuid, p_provider text, p_operation text,
  p_estimated numeric, p_expires_minutes integer default 15
) returns jsonb language plpgsql as $$
declare
  v_project uuid; v_workspace uuid;
  v_run_budget numeric; v_project_budget numeric; v_workspace_budget numeric;
  v_run_spent numeric; v_project_spent numeric; v_workspace_spent numeric;
  v_res uuid; v_status text;
begin
  select r.project_id, p.workspace_id, r.budget_usd, p.budget_monthly_usd,
         coalesce((w.settings->>'budget_monthly_usd')::numeric, 200)
    into v_project, v_workspace, v_run_budget, v_project_budget, v_workspace_budget
    from runs r join projects p on p.id = r.project_id join workspaces w on w.id = p.workspace_id
    where r.id = p_run_id;
  if v_project is null then return jsonb_build_object('status','error','reason','run_not_found'); end if;

  perform pg_advisory_xact_lock(hashtext(p_run_id::text));

  v_run_spent := budget_spent_with_pending(p_run_id) + p_estimated;
  if v_run_spent > v_run_budget then
    return jsonb_build_object('status','hard','scope','run','spent',v_run_spent,'budget',v_run_budget);
  end if;

  select coalesce(sum(cost_usd),0) into v_project_spent from cost_ledger
    where project_id = v_project and occurred_at >= date_trunc('month', now());
  v_project_spent := v_project_spent
    + coalesce((select sum(estimated_cost_usd) from pending_charges where project_id = v_project and status='reserved'),0)
    + p_estimated;
  if v_project_spent > v_project_budget then
    return jsonb_build_object('status','hard','scope','project','spent',v_project_spent,'budget',v_project_budget);
  end if;

  select coalesce(sum(cost_usd),0) into v_workspace_spent from cost_ledger
    where workspace_id = v_workspace and occurred_at >= date_trunc('month', now());
  v_workspace_spent := v_workspace_spent
    + coalesce((select sum(estimated_cost_usd) from pending_charges where workspace_id = v_workspace and status='reserved'),0)
    + p_estimated;
  if v_workspace_spent > v_workspace_budget then
    return jsonb_build_object('status','hard','scope','workspace','spent',v_workspace_spent,'budget',v_workspace_budget);
  end if;

  insert into pending_charges(run_id, project_id, workspace_id, provider, operation, estimated_cost_usd, expires_at)
    values (p_run_id, v_project, v_workspace, p_provider, p_operation, p_estimated,
            now() + (p_expires_minutes || ' minutes')::interval)
    returning id into v_res;

  v_status := case when v_run_spent > 0.8 * v_run_budget then 'soft' else 'ok' end;
  return jsonb_build_object('status', v_status, 'reservation_id', v_res, 'spent', v_run_spent, 'run_budget', v_run_budget);
end $$;

create or replace function commit_charge(p_reservation_id uuid, p_real numeric)
returns void language plpgsql as $$
declare v pending_charges%rowtype;
begin
  update pending_charges set status='committed' where id = p_reservation_id and status='reserved' returning * into v;
  if not found then return; end if;
  insert into cost_ledger(run_id, project_id, workspace_id, provider, operation, cost_usd, reservation_id)
    values (v.run_id, v.project_id, v.workspace_id, v.provider, v.operation, p_real, v.id);
end $$;

create or replace function release_charge(p_reservation_id uuid)
returns void language plpgsql as $$
begin update pending_charges set status='released' where id = p_reservation_id and status='reserved'; end $$;

create or replace function release_expired_charges()
returns integer language sql as $$
  with upd as (update pending_charges set status='expired'
               where status='reserved' and expires_at < now() returning 1)
  select count(*)::int from upd;
$$;

-- ---- RLS: public read (writes go through the service role) -------------------
alter table system_flags    enable row level security;
alter table cost_ledger     enable row level security;
alter table pending_charges enable row level security;
alter table run_steps       enable row level security;

do $$
begin
  create policy "public read" on system_flags    for select using (true);
exception when duplicate_object then null; end $$;
do $$
begin
  create policy "public read" on cost_ledger     for select using (true);
exception when duplicate_object then null; end $$;
do $$
begin
  create policy "public read" on pending_charges for select using (true);
exception when duplicate_object then null; end $$;
do $$
begin
  create policy "public read" on run_steps       for select using (true);
exception when duplicate_object then null; end $$;
