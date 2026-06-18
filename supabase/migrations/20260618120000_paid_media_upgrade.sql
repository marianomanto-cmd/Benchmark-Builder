-- Paid media scraping upgrade (2026-06-18). Idempotent.
--
-- 1) Advertiser-id cache on competitor_platforms — lets paid runs query ad
--    libraries by numeric advertiser/page id (higher recall + precision) and
--    attribute ads back to a competitor. Warmed automatically by the runner's
--    learn-back step (lib/runner.ts) and pinnable by ops.
-- 2) Enable Instagram / Facebook / TikTok ad-library scraping (paid source rows)
--    — previously these had no paid adapter/row and were silently skipped, so
--    Meta ads only flowed through the meta_ads key. Actor is auto-selected per
--    case study (lib/sources/select-actor.ts); actor_id null = automatic.
-- 3) Declared fallback actors per paid source (schema-drift mitigation; the
--    runner now actually retries with the fallback before degrading).
-- 4) X has NO public ad library: paid X was returning organic conversation via
--    Grok (mislabeled as advertising) → disable it so "paid" stays honest.

alter table public.competitor_platforms
  add column if not exists advertiser_id text;

-- IG/FB/TikTok ads route through the Meta Ad Library / TikTok Ads Library +
-- Creative Center. Actor auto-selected (actor_id null); fallback declared.
insert into source_settings (platform, scope, provider, actor_id, actor_build, fallback_actor_id, enabled, results_limit) values
  ('instagram', 'paid', 'apify', null, null, 'curious_coder~facebook-ads-library-scraper', true, 25),
  ('facebook',  'paid', 'apify', null, null, 'curious_coder~facebook-ads-library-scraper', true, 25),
  ('tiktok',    'paid', 'apify', null, null, 's-r~tiktok-ads-library',                      true, 25)
on conflict (platform, scope) do nothing;

-- Declare fallback actors for the pre-existing paid rows (only if unset).
update source_settings set fallback_actor_id = 'curious_coder~facebook-ads-library-scraper'
  where scope = 'paid' and platform = 'meta_ads' and fallback_actor_id is null;
update source_settings set fallback_actor_id = 'silva95gustavo~google-ads-scraper'
  where scope = 'paid' and platform = 'google_ads' and fallback_actor_id is null;

-- X has no public ad library; disable paid X (re-enable if a real source exists).
update source_settings set enabled = false where platform = 'x' and scope = 'paid';
