-- Paid ad platforms that aren't organic feeds. Separate migration because
-- Postgres won't let a freshly-added enum value be used in the same transaction.
alter type platform add value if not exists 'google_ads';
alter type platform add value if not exists 'linkedin_ads';
