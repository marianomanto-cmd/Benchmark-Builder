# Apify — actores que leen SÓLO publicidad (ad libraries / ad detection)

> Decisión de producto (13/jun): **no usamos la API oficial de Meta Ad Library**.
> Los anuncios se obtienen **vía scrapers de Apify** que leen las *ad libraries*
> y *creative centers* públicos (no orgánico). Lista para tener a mano y validar
> antes de cablear en `source_settings` (con build pin) por `platform,scope=paid`.
>
> ⚠️ Verificar cada actor antes de usar: vigencia, pricing, schema de salida y
> que respete TOS. Los slugs pueden cambiar; pinear `actor_build`.

## Meta / Facebook · Instagram (Ad Library)
- **`apify/facebook-ads-scraper`** — "📢 Facebook Ads Library Scraper" (oficial de Apify). *Recomendado de base.*
- `curious_coder/facebook-ads-library-scraper` — extrae ads del Ad Library + por lista de páginas.
- `scraper-engine/facebook-ads-library-scraper`
- `webdatalabs/meta-ad-library-scraper` — "Pro".
- `s-r/meta-ads-library`
- `igolaizola/facebook-ad-library-scraper` — **expone MCP** (interesante para integrar como tool).
- Sin login / sin API token (scrapean el Ad Library público). Traen creativo, imágenes/videos, página, impresiones y targeting.

## TikTok (Ad Library EU/UK + Creative Center global)
- **`s-r/tiktok-ads-library`** — TikTok Ads Library API. *Candidato.*
- `crawlerbros/tiktok-ads-library-scraper-pro`
- `coregent/tiktok-ads-library-creative-center-scraper` — Ads Library + Creative Center.
- `beyondops/tiktok-ad-library-scraper` — Ad Library Spy + Creative Center.
- `parseforge/tiktok-creative-center-top-ads-scraper` — top ads del Creative Center.
- `lexis-solutions/tiktok-ads-scraper`
- Traen creativos top, video URLs, ranking CTR, marca, presupuesto.

## Google Ads Transparency Center
- **`lexis-solutions/google-ads-scraper`** / `silva95gustavo/google-ads-scraper` / `getdataforme/google-ad-scraper`
- Buscan por keyword / dominio / advertiser ID / URL; traen todos los ads del anunciante en Search, YouTube, Display y Shopping (50+ países) con texto/imagen/video + metadata.

## LinkedIn (Ad Library)
- **`unseenuser/linkedin-ads`** — "LinkedIn Ads Scraper · Ad Library API, No Login". Trae headline, body, CTA + URL, imágenes, formato y entidad que paga.

## Multi-plataforma (todo-en-uno)
- Existen actores que trackean Meta + Google Ads Transparency + TikTok Creative Center juntos (evaluar si conviene uno solo vs. uno por plataforma).

---

### Cómo se cablean en Phema
- **Selección automática (no la maneja el usuario).** Para cada reporte el actor se
  elige solo, por caso de estudio, en `lib/sources/select-actor.ts` (`selectActor`):
  - Precedencia: override de ops por env (`APIFY_ACTOR_<PLATFORM>[_<SCOPE>]`) →
    catálogo por caso de estudio (plataforma, scope, geo/mercado) → connector default.
  - TikTok: si el `geo` cae en EU-27 + UK usa la Ads Library oficial
    (`s-r~tiktok-ads-library`); fuera de eso, el Creative Center global.
  - IG/Facebook ads → Meta Ad Library (`apify~facebook-ads-scraper`).
- `/settings` ya **no** expone el actor: sólo se elige qué fuentes participan y el
  tope de resultados (`results_limit`). `source_settings.actor_id` queda como pin
  opcional de ops; si está, gana sobre la selección automática.
- El runner corre el actor elegido bajo el **guard de costos** y normaliza los ads a
  `mentions` (`is_ad=true` + `engagement.ad`).
- `meta_ads` → Meta; `google_ads` → Google Transparency; `linkedin_ads` → LinkedIn;
  TikTok ads entran como `tiktok` scope=paid.
