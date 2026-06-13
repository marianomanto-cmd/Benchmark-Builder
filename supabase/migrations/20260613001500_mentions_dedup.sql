-- Non-partial unique index so upserts can use (project_id, platform, external_id)
-- as a clean conflict target. NULL external_ids (demo rows) remain distinct.
create unique index mentions_dedup on mentions (project_id, platform, external_id);
