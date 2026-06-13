-- Persist the structured discovery plan on the run (revisitable runs) and add a
-- kill-switch for the official Meta Ad Library API (political routing).
alter table runs add column if not exists plan jsonb;
alter table runs add column if not exists scope text;       -- organic | paid | both
alter table runs add column if not exists ad_intent text;   -- commercial | political | mixed

insert into system_flags (key, value) values ('meta_api_enabled', 'true'::jsonb) on conflict (key) do nothing;
