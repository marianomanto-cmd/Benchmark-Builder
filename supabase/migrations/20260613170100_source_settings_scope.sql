-- Actor registry by (platform, scope): organic vs paid, with version pin and a
-- declared fallback (schema-drift mitigation, doc 14). Idempotent.
alter table source_settings add column if not exists scope text not null default 'organic'
  check (scope in ('organic','paid'));
alter table source_settings add column if not exists provider text;          -- apify | meta_api | grok | reddit | mastodon | bluesky | web
alter table source_settings add column if not exists actor_build text;        -- version pin
alter table source_settings add column if not exists fallback_actor_id text;  -- declared fallback per platform

-- meta_ads is paid by nature; everything else stays organic.
update source_settings set scope = 'paid' where platform = 'meta_ads';

-- backfill provider for existing organic rows.
update source_settings set provider = 'apify'    where provider is null and platform in ('instagram','tiktok','youtube','facebook','web');
update source_settings set provider = 'grok'     where provider is null and platform = 'x';
update source_settings set provider = 'reddit'   where provider is null and platform = 'reddit';
update source_settings set provider = 'mastodon' where provider is null and platform = 'mastodon';
update source_settings set provider = 'bluesky'  where provider is null and platform = 'bluesky';

-- repk to (platform, scope).
alter table source_settings drop constraint if exists source_settings_pkey;
alter table source_settings add primary key (platform, scope);

-- seed paid rows (idempotent). Community actor slugs are placeholders, editable
-- in /settings; validate + pin the build on deploy. Meta paid commercial uses the
-- maintained scraper; the official API (meta_api) is the political route (§3).
insert into source_settings (platform, scope, provider, actor_id, actor_build, fallback_actor_id, enabled, results_limit) values
  ('meta_ads',    'paid', 'apify', 'apify~facebook-ads-scraper',          null, null, true, 25),
  ('google_ads',  'paid', 'apify', 'apify~google-ads-transparency-scraper', null, null, true, 25),
  ('linkedin_ads','paid', 'apify', 'apify~linkedin-ad-library-scraper',     null, null, true, 25),
  ('x',           'paid', 'grok',  null, null, null, true, 25)
on conflict (platform, scope) do nothing;

-- ensure meta_ads paid points at the commercial scraper (a pre-existing meta_ads
-- row may have backfilled to provider meta_api before the seed ran).
update source_settings set provider = 'apify', actor_id = 'apify~facebook-ads-scraper'
  where platform = 'meta_ads' and scope = 'paid' and actor_id is null;
