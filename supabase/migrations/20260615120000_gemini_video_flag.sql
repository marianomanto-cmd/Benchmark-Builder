-- Kill-switch for Gemini native video understanding (vision + audio in one call).
-- Gated like every provider: master switch (external_apis_enabled) AND this flag
-- AND the GOOGLE_AI_API_KEY env var must all be set for a live call to fire.
insert into system_flags (key, value) values ('gemini_enabled', 'true'::jsonb) on conflict (key) do nothing;
