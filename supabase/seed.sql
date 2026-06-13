-- Benchmark Builder — demo seed (Copa · Cartagena Q2 2026 case).
-- Idempotent enough to re-run; competitors use (project_id, handle) conflict guard.

insert into workspaces (name, slug, brand_color)
values ('Copa Airlines', 'copa', '#6b1a36')
on conflict (slug) do nothing;

insert into projects (workspace_id, name, slug, period_days, status)
select id, 'Cartagena · Q2 2026', 'cartagena-q2-2026', 60, 'active'
from workspaces where slug = 'copa'
on conflict (slug) do nothing;

insert into competitors (project_id, name, handle, brand_letter, accent, is_client, mentions, engagement_total, reach_estimate, sov, sentiment, sort_order)
select p.id, v.name, v.handle, v.brand_letter, v.accent, v.is_client, v.mentions, v.engagement_total, v.reach_estimate, v.sov, v.sentiment::sentiment_kind, v.sort_order
from projects p,
(values
  ('Avianca','avianca','A','var(--n900)',false,998,'412k','1,8M',41.3,'pos',0),
  ('LATAM Colombia','latamcol','L','var(--n700)',false,581,'264k','1,1M',24.0,'mix',1),
  ('Wingo','wingo.col','W','var(--n500)',false,312,'198k','680k',12.9,'neu',2),
  ('Arajet','arajetdom','J','var(--n400)',false,287,'142k','420k',11.9,'neu',3),
  ('Copa Airlines','copaairlines','C','var(--sa-base)',true,240,'188k','520k',9.9,'pos',4)
) as v(name,handle,brand_letter,accent,is_client,mentions,engagement_total,reach_estimate,sov,sentiment,sort_order)
where p.slug = 'cartagena-q2-2026'
on conflict (project_id, handle) do nothing;

insert into competitor_platforms (competitor_id, platform, sort_order)
select c.id, pf.platform::platform, pf.ord
from competitors c
join projects p on p.id = c.project_id and p.slug = 'cartagena-q2-2026'
join (values
  ('avianca','instagram',0),('avianca','tiktok',1),('avianca','youtube',2),('avianca','x',3),('avianca','meta_ads',4),
  ('latamcol','instagram',0),('latamcol','facebook',1),('latamcol','x',2),('latamcol','meta_ads',3),
  ('wingo.col','instagram',0),('wingo.col','tiktok',1),('wingo.col','facebook',2),
  ('arajetdom','instagram',0),('arajetdom','x',1),('arajetdom','web',2),
  ('copaairlines','instagram',0),('copaairlines','youtube',1),('copaairlines','x',2),('copaairlines','meta_ads',3)
) as pf(handle, platform, ord) on pf.handle = c.handle
on conflict do nothing;

insert into mentions (project_id, platform, author, handle, ts_label, brand, body, sentiment, is_ad, thumb_type, metrics, sort_order)
select p.id, v.platform::platform, v.author, v.handle, v.ts_label, v.brand, v.body, v.sentiment::sentiment_kind, v.is_ad, nullif(v.thumb_type,'')::thumb_kind, v.metrics::jsonb, v.sort_order
from projects p,
(values
  ('instagram','Avianca','avianca','hace 4 h','Avianca','Cartagena en frecuencia diaria desde Bogotá y Medellín. Conocé los nuevos horarios de mañana ☀️','pos',false,'photo','[["♡","12,4k"],["💬","284"],["↗","842"]]',0),
  ('meta_ads','Avianca','avianca · ad','activo · 12 d','Avianca','Vuelos a Cartagena desde USD 89. Combiná con Medellín y Santa Marta. Reservá hasta el 30/05.','pos',true,'ad','[["€","USD 8–12k"],["👁","est. 1,4M"]]',1),
  ('tiktok','LATAM Colombia','latamcol','hace 9 h','LATAM','POV: tu primera vez en Cartagena. Etiquetá a quien te llevarías 👇 #latamtok','pos',false,'video','[["▷","1,2M"],["♡","98k"],["💬","3,4k"]]',2),
  ('youtube','Wingo','wingo.col','hace 1 d','Wingo','Vlog · Cartagena en 48h con vuelo Wingo · Costos reales · Tips de viaje 2026','neu',false,'video','[["▷","42k"],["♡","2,1k"]]',3),
  ('instagram','Copa Airlines','copaairlines','hace 18 h','Copa','Atardecer en Cartagena, vista desde el equipo Copa ✈️ #copaairlines','pos',false,'photo','[["♡","8,2k"],["💬","142"]]',4),
  ('web','El Espectador','elespectador.com','03/05','—','Avianca, LATAM y Wingo aumentan frecuencia a Cartagena para temporada 2026.','neu',false,'article','[["📄","prensa"],["👁","24k"]]',5)
) as v(platform,author,handle,ts_label,brand,body,sentiment,is_ad,thumb_type,metrics,sort_order)
where p.slug = 'cartagena-q2-2026';

insert into insights (project_id, kind, title, body, sources, confidence, sort_order)
select p.id, v.kind::insight_kind, v.title, v.body, v.sources, v.confidence, v.sort_order
from projects p,
(values
  ('opp','LATAM no usa TikTok orgánico','Cero piezas orgánicas en TikTok en los últimos 60 días, mientras Avianca y Wingo concentran 124 videos combinados. Nicho abierto.',38,0.87,0),
  ('thr','Avianca duplicó spend en Meta','Spend estimado pasó de USD 4–6k (mes 1) a USD 8–12k (mes 2). 22 nuevos creativos, segmentación CO + PA + US.',14,0.79,1),
  ('pat','Picos jueves 11h','89 % de las publicaciones top en engagement se publicaron entre martes 18 h y jueves 11 h. Patrón estable a 8 semanas.',62,0.92,2)
) as v(kind,title,body,sources,confidence,sort_order)
where p.slug = 'cartagena-q2-2026';

insert into runs (project_id, number, cost_used, cost_soft, cost_hard, status)
select p.id, 42, 42.18, 50, 75, 'done'
from projects p where p.slug = 'cartagena-q2-2026';
