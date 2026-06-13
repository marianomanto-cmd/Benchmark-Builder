# Phema — Estado de desarrollo (repo: Benchmark-Builder)

> Documento de contexto para consultar en otra conversación. Última actualización: 2026‑06‑13 (sesión extendida). Producto: **Phema** (repo: Benchmark-Builder).
> App de **research competitivo y social listening asistido por IA**. Caso demo: **Copa Airlines vs Avianca / LATAM / Wingo / Arajet · ruta Cartagena**.
>
> ⚠️ **Mantené este documento actualizado en cada cambio** (regla en `AGENTS.md` → "Documentation discipline"). Un cambio no está terminado hasta que la doc lo refleja.

---

## 0. ✅ Deploy de Vercel — causa encontrada y arreglada (2026‑06‑13)

- **Síntoma:** Vercel quedó construyendo `1d5b542` y no levantaba los commits nuevos de `main` (Task 1, rediseño, cortina, actores); ningún push posterior generaba deployment.
- **Causa raíz (real):** el `vercel.json` agregado en `032332e` definía un **cron `*/5 * * * *`** para `/api/cron/cost`. En el **plan Hobby**, Vercel **sólo permite cron jobs diarios**, así que **rechazaba la creación de la deployment** de todo commit `032332e`+ (*"Hobby accounts are limited to daily cron jobs"*). Por eso no aparecían builds (ni fallidas): se rechazaban **antes** de construir. Los commits ≤ `1d5b542` (sin cron) deployaban bien, y el "Redeploy" de `1d5b542` también. No era el webhook ni la conexión.
- **Fix:** se cambió el cron a **diario** (`0 6 * * *`) en `vercel.json`. Si se pasa a plan **Pro**, se puede volver a `*/5 * * * *`. Production Branch = `main` ✅, repo conectado + GitHub App con acceso ✅, build local de `493c114` verde.

`main` contiene todo el trabajo; con este fix el push a `main` vuelve a deployar el rediseño. Repo: `marianomanto-cmd/Benchmark-Builder`.

---

## 1. Resumen del producto

Un operador (agencia/marca o consultor político) crea **runs** de research. Cada run define un marco (problema de negocio, competidores, alcance/fechas, **orgánico y/o paid**), la app **estima el costo antes de ejecutar**, corre scraping + análisis con IA bajo **control de costos**, y produce un **dashboard** (KPIs, charts, feed de menciones, comparativa, galería orgánico/pago) con un **bloque de análisis protagonista por sección**. Los runs quedan guardados y revisitables.

**Flujo:** Portal (`/`, cortina animada → campo IA "¿Qué querés investigar hoy?") → **discovery** infiere el plan → **Wizard** (problema → competidores → alcance/fechas → **orgánico/paid** → estimación) → ejecutar run (bajo guard de costos) → **Dashboard**. Historial en `/runs`.

---

## 2. Stack e infraestructura

| Capa | Tecnología |
|---|---|
| Framework | **Next.js 16** (App Router, Turbopack), React 19, TypeScript estricto |
| Estilos | **Tailwind CSS v4** (CSS-first) + tokens en `app/globals.css` |
| Fuentes | Geist · JetBrains Mono · Newsreader (`next/font`) |
| UI | Componentes propios (inline-styles + tokens) + **Tremor** (vendorizado) + CSS module para la home (`components/marketing/marketing.module.css`) |
| Tema | **next-themes**, **default DARK** (toggle claro). Lenguaje fourmula: near-black ciruela + sangría brillante |
| Animación | **motion** (Framer Motion) + **lenis** (smooth scroll) + Canvas 2D (hero) |
| Backend | **Supabase** (Postgres + RLS). Project ID: `wjexqyliwwsxjdujgwjo` |
| IA | **Anthropic Claude** (`claude-opus-4-8`, default) · **xAI Grok** opcional |
| Scraping | **Apify** (orgánico + ad libraries), **Grok** (X), **Meta Ad Library** (API oficial, ruta política), **Reddit/Mastodon/Bluesky** |
| Validación | **Zod** (discovery plan, normalizers) |
| Deploy | **Vercel** (push a `main`). Ver §0 (deploy roto del lado de Vercel). |

---

## 3. Estructura del repo (cambios recientes en **negrita**)

```
app/
  page.tsx                 Portal (/) → Portal compone hero + secciones marketing
  not-found.tsx            **404 con carácter**
  overview/ live-feed/ comparativa/ galeria/ research-plan/ editor/ reporte/ runs/ settings/
  api/runs/route.ts        POST → executeRun (acepta scope, adIntent, plan)
  api/runs/[id]/cost/route.ts   **GET → snapshot de costo del run (CostMeter)**
  api/cron/cost/route.ts   **GET → libera reservas vencidas + checkCostAlerts (Vercel Cron diario en Hobby; */5 en Pro)**
  api/discovery/route.ts   **POST → infiere ResearchPlan del prompt**
  api/settings/sources/route.ts  POST → guarda config de fuentes (por platform,scope)
  globals.css              Tokens light/dark (dark = default), escala editorial, lenis, marquee
  layout.tsx               ThemeProvider (defaultTheme=dark) + SmoothScroll + OG metadata
components/
  marketing/               **site-nav, hero-canvas, sources-marquee, what-it-does, process,**
                           **deliverable, faq, site-footer, marketing.module.css**
  motion/                  **smooth-scroll (Lenis), reveal (whileInView)**
  screens/                 portal (compone marketing), portal-hero (cortina+canvas+box IA),
                           **home-wizard (wizard embebido)**, overview, live-feed, comparativa, galeria,
                           **swot (FODA+estrategia)**, editor, report-pdf, runs, research-plan (legacy)
  ui/ tremor/ shell/ domain.tsx analysis-block.tsx command-palette.tsx run-button.tsx **run-assistant.tsx** theme-*
lib/
  platforms.ts             PLATFORM_KEYS (tuple) + PlatformKey (incluye **google_ads, linkedin_ads**)
  cost/                    **rates, estimate, config, ledger, guarded, alerts, index** (motor de costos)
  discovery/               **schema (Zod ResearchPlan + heurística + campos de marca), classify (Claude/mock), jobs (planToJobs), suggest (sugerencias+asistencia mock-safe del wizard)**
  media/                   **types/config/download(TTL 12h)/frames(ffmpeg)/audio/analyze(Claude vision)/transcribe(Whisper)/consolidate/index/fixtures** (Task 2, mock-first, bajo guard)
  sources/                 types (+scope, +AdMeta), reddit, mastodon, bluesky, apify, **apify-ads**, meta-ads,
                           grok-x, index (**sourceFor(platform, scope)** + metaAdsOfficial)
  runner.ts                **executeRun(slug, platforms?, keywords?, {scope, adIntent, plan})** — jobs organic+paid
  runner-fixtures.ts       **fixtures mock: demoRawMentions, demoAdMentions, demoScores, demoInsightDrafts**
  ai/ data.ts demo.ts view-models.ts database.types.ts supabase/ format.ts
scripts/                   **test-run-mock.ts, cost-check.ts** (tsx --conditions=react-server --env-file=.env.local)
supabase/migrations/       DDL versionado (incluye cost_controls, paid_platforms_enum, source_settings_scope, runs_research_plan)
.claude/skills/            Skills de marketing vendorizados
```

---

## 4. Modelo de datos (Supabase, schema public)

Base: **workspaces** (+`settings` jsonb) · **projects** (+`budget_monthly_usd`) · **competitors** · **competitor_platforms** · **mentions** (unique `project_id,platform,external_id`; ads usan `engagement.ad` + `metrics`) · **insights** · **run_sources** · **run_analysis**.

**runs** (+ nuevas cols): `budget_usd` (cap, default 30), `cost_estimated_low/high`, `cost_actual`, **`plan` (jsonb ResearchPlan)**, **`scope`** (organic/paid/both), **`ad_intent`** (commercial/political/mixed). (Quedan `cost_soft/cost_hard` legacy.)

**source_settings** — ahora **PK `(platform, scope)`**: `provider` (apify|meta_api|grok|reddit|mastodon|bluesky|web), `actor_id`, **`actor_build`** (version pin), **`fallback_actor_id`**, `enabled`, `results_limit`. Filas paid sembradas: `meta_ads` (apify scraper; API oficial en ruta política), `google_ads` + `linkedin_ads` (actores **community placeholder** `apify~…`, validar/pinear en Vercel), `x` (grok).

**Control de costos (Task 1):**
- **system_flags** (`key` PK, `value` jsonb) — kill switch: `external_apis_enabled` (master) + `apify_enabled`, `anthropic_enabled`, `openai_enabled`, `brave_enabled`, `xai_enabled`, `meta_api_enabled`.
- **cost_ledger** (gasto comiteado: run/project/workspace, provider, operation, cost_usd, reservation_id, occurred_at).
- **pending_charges** (reservas: estimated_cost_usd, status reserved|committed|released|expired, expires_at).
- **run_steps** (timeline del CostMeter: label, provider, cost_usd, cumulative_usd, metadata).

**Medios (Task 2):** `media_files` (url, kind image/video/audio, status, `expires_at` 12h, idempotente por `project_id,url`) · `media_analysis` (summary "qué muestra", shows, ocr_text, **transcript "qué dice"**, language, sentiment, brand_safety, topics, model, cost_usd). RLS public read. Migración `20260613210000_media_pipeline.sql` (aplicada).

**RPCs:** `budget_spent_with_pending`, `reserve_budget` (lock por run `pg_advisory_xact_lock` FM-05; caps run/project-mensual/workspace-mensual; devuelve ok|soft(≥80%)|hard|error), `commit_charge` (idempotente), `release_charge`, `release_expired_charges`.

Enum `platform`: instagram, tiktok, youtube, facebook, x, reddit, mastodon, bluesky, web, meta_ads, **google_ads, linkedin_ads**. RLS `public read` en todas (escrituras = service role). **Auth/multi-tenancy sin definir** (pendiente).

---

## 5. Pipeline de ingesta + control de costos

`POST /api/runs { slug?, platforms?, keywords?, scope?, adIntent?, plan? }` → `lib/runner.ts executeRun`:
1. Resuelve un **ResearchPlan** (explícito del wizard, o derivado de platforms+scope+adIntent).
2. `planToJobs(plan, source_settings)` → **un job por `(plataforma × scope)`** (organic y/o paid según scope; enabled).
3. **Estimación** (`estimateRunCost`) desde esos jobs → `cost_estimated_low/high` en el run.
4. Cada job pasa por **`guardedCall`** (orden: `isApiEnabled` → reserva `reserveBudget` → llamada con timeout + reintentos acotados → `commitCharge`/`releaseCharge`; escribe `run_steps`+`cost_ledger`).
5. Routing paid: **anuncios SÓLO vía scrapers** (Apify ad-library / ad-detection). La **API oficial de Meta Ad Library queda descartada** como vía (decisión de producto 13/jun); el path `meta_api` queda legacy/desactivado. Fallos **degradan** (no rompen). Ads normalizados a `mentions` (is_ad + `engagement.ad`). Candidatos de actores ad-only (Meta/TikTok/Google/LinkedIn) anotados en `docs/apify-ad-actors.md`.
6. Sentimiento (Claude) + agregados + insights (Claude), todo bajo guard. Finaliza con `cost_actual` desde el ledger.

**Modo de ejecución — `PIPELINE_MODE` (default `mock`):**
- **mock**: conectores e IA devuelven **fixtures deterministas**; igual pasan por reserve/commit con **costo simulado** (valida el flujo completo a **costo cero**). Reemplaza al viejo `LIVE_RUN`.
- **live**: una llamada paga ocurre **solo si las 3 condiciones simultáneas**: `PIPELINE_MODE=live` **y** flag del proveedor en `system_flags` **y** API key presente. Si falta cualquiera → no se gasta (fixture).
- Crons: `GET /api/cron/cost` (Vercel Cron **diario `0 6 * * *`** en plan Hobby; `*/5` requiere Pro) y `npm run cost:check` liberan reservas vencidas + alertas (run>$50, provider>$100/día, aceleración >5×).
- Validación: `npm run test:run-mock` (requiere `SUPABASE_SERVICE_ROLE_KEY` local) — re-run sin duplicar costos, kill-switch corta en <60s, total == estimación. RPCs validadas vía SQL.

**Discovery (prompt → plan):** `lib/discovery` — `classifyPrompt` (Claude en live / **heurística determinista en mock**, costo cero) → `ResearchPlanSchema` (Zod). Señales: paid = "anuncios/publicidad/campañas/pauta"; organic = "qué se dice/conversación/sentimiento"; político = candidato/elección/partido. El wizard lo usa para pre-seleccionar scope/ad_intent.

---

## 6. Diseño / theming (rediseño fourmula)

- **Dark por defecto** (toggle claro). Paleta `.dark`: `--bg #0A0810`, `--surface #15131C/#1C1924`, texto `#F4F1EA/#8C8696/#5A5563`, **`--accent #F23A5E`** (sangría brillante), `--accent-ink`. Tema claro conserva sangría `#6B1A36`.
- Escala editorial (`.t-hero`, `.t-section`, `.t-eyebrow`, `.t-lead`) con Newsreader gigante. `--series-*` monocromo + cliente en acento; Tremor `ink/sangria` con variantes `dark:` al nuevo acento.
- **Home**: **video de fondo inmersivo GLOBAL** (Grok, muteado + loop, ~2.9MB; vive detrás del hero, el wizard y el run — `components/marketing/site-bg.tsx`, fijo z-index -1, body transparente) con scrim de legibilidad theme-aware. **Sin cortina**: al cargar ves la animación y a ~2.5s ("inmersión") aparecen tagline + box IA. Marquee de fuentes, "qué hace" (swap before/after), proceso 01–04, showcase del reporte, FAQ, footer interactivo. Smooth scroll (Lenis) + reveals; `prefers-reduced-motion`, focus-visible, AA.
- Componentes del dashboard migrados a tokens semánticos (no rompen en dark). **Responsive** desde la home (nav mobile, type fluida, grillas que colapsan).
- **Pase cosmético global** (vía tokens): radios más suaves (`--r-*`), **sombras visibles en dark** (`--sh-*`), scrollbars finos temáticos, `::selection` con acento, y hover/active consistente en botones (`.bb-btn`).

---

## 7. Pantallas / rutas

`/` portal + **wizard de research embebido en el home** (paso a paso asistido por IA: marca → mercados → competidores → orgánico/paid → descartes → fechas → costo; botón "no sé, sugerime" + validación por paso) · `/overview` dashboard · `/live-feed` · `/comparativa` · `/galeria` (orgánico vs pago) · **`/swot` (FODA + matriz act/wait/react/fall back + roadmap corto/mediano/largo)** · `/editor` · `/reporte` · `/runs` · `/settings` · `/not-found`. El shell del run trae un **asistente flotante** (consulta IA acotada a los resultados, con aviso de costo; si la pregunta se va de alcance, invita a iniciar una nueva investigación). Todo **responsive** (sin scroll horizontal). `/research-plan` queda como ruta legacy. Extras: ⌘K, transiciones, skeletons.

---

## 8. Variables de entorno / API keys

Cargar en **Vercel → Settings → Environment Variables** (ver `.env.example`):

| Var | Estado | Para qué |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY` | auto (integración) | cliente Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | **verificar/cargar** | escritura del runner (y `test:run-mock` local) |
| `PIPELINE_MODE` | `mock` (default) / `live` | enciende llamadas reales (con flags+keys) |
| `ANTHROPIC_API_KEY` | tengo la key | IA (Claude) |
| `XAI_API_KEY` (+`XAI_MODEL`) | tengo la key | X vía Grok |
| `APIFY_TOKEN` | tengo la key | scraping orgánico + ad libraries |
| `META_AD_LIBRARY_TOKEN` | **falta** | anuncios Meta API oficial (ruta política) |
| `OPENAI_API_KEY` | **falta** | transcripción Whisper (Task 2) |
| `BRAVE_API_KEY` | opcional | búsqueda |
| `GOOGLE_AI_API_KEY` (Gemini) | **falta** | imágenes (OG/hero reales) |
| `CRON_SECRET`, `RUN_TRIGGER_SECRET`, `AI_PROVIDER` | opcionales | cron auth / trigger / selector IA |
| `RATE_*`, `EST_*`, `ALERT_*`, `MAX_*` | opcionales | override de precios/estimación/alertas/límites |

Las keys reales viven solo en `.env.local` (gitignored), **nunca** commiteadas.

---

## 9. Hecho vs pendiente

**Hecho:** rediseño fourmula (dark default, home con cortina+box IA, responsive, 404, OG placeholder) · **Task 1 motor de costos** (estimate, reserva atómica, guardedCall, kill-switch, ledger/run_steps, crons, mock end-to-end costo cero) · **actores Apify orgánico/paid + discovery por prompt** (registry por `platform,scope`, planToJobs, routing comercial/político) · 7 pantallas + portal + runs + settings · pipeline de ingesta.

**UX overhaul (sesión 13/jun):** fix de **scroll** (Lenis acotado a `/`, `min-height:0` en el shell) · **pase responsive/mobile** (guard global anti scroll-horizontal + helpers `.bb-collapse/.bb-row/.bb-scroll-x/.bb-hide-sm`, grids a auto-fit) · **wizard embebido en el home** (7 pasos asistidos por IA, **datos de marca** para análisis comparativo, sugerencias y validación mock-safe en `lib/discovery/suggest.ts`, costo visible) · **tab FODA & Estrategia** (`/swot`) · **asistente flotante** del run · limpieza del shell (sin lupa `/research-plan`, sin tabs obsoletos) · **medios reales** en galería/feed (fotos + videos, placeholders libres Picsum/Google samples a swappear por scrapeo) · **aurora ambiental** animada en el home · **runs de varias marcas** en el historial · **Proyectos como carpetas** (`/proyectos`, agrupan runs) · **hero con imagen inmersiva** (Grok) animada sutil (Ken Burns + parallax) · **media pipeline mock** con análisis "qué muestra/qué dice" en galería · **mobile del run** con hamburguesa + drawer · **editor de reporte FUNCIONAL** (bloques: título/subtítulo/párrafo/cita/KPI/lista/gráfico/**tabla**; edición inline al clickear; índice navegable; vista previa; **export PDF** vía print; autosave en localStorage) · **live-feed interactivo** (filtros que togglean competidores/plataformas/sentimiento/tipo + orden por engagement + **descarga CSV**) · **comparativa** con **descarga CSV** · **video de fondo GLOBAL** (Grok, **crossfade** sin cortes, detrás de hero/wizard/run; **sin cortina**) · **superficies glass** (estilo giga) · **rename a Phema** + **logo con glow** + favicon · **seed ampliado** (más runs y proyectos variados) · **botones cableados** (PDF/Generar reporte/Insertar en reporte/Modo presentación).

**Política de etiquetado del análisis (IMPORTANTE):** el análisis se produce con **Grok + Claude + los skills de marketing del repo** (`.claude/skills`), pero la **UI NUNCA lo revela** — no nombra el motor ni dice "IA"; sólo muestra **"Análisis + Insights"**. Mantener esta regla en todo texto user-facing nuevo.

**Pendiente (próximo):**
1. ✅ **Deploy de Vercel — resuelto** (§0): el `vercel.json` tenía un cron `*/5` no permitido en Hobby (Vercel rechazaba toda deployment `032332e`+); se pasó a cron **diario** y `main` vuelve a deployar.
2. **Validar/pinear actores community** (Google/LinkedIn) en Vercel (slugs reales + build pin).
3. ✅ **Task 2 — pipeline de medios (mock-first hecho):** tablas `media_files`/`media_analysis` (migradas) + `lib/media/` (download TTL 12h, extractFrames ffmpeg, extractAudio, analyzeImage/Frame Claude vision + Zod, transcribe Whisper, consolidate, index idempotente **bajo guard**, fixtures); galería muestra "qué muestra / qué dice". **Pendiente (solo keys):** `OPENAI_API_KEY` (Whisper) y/o `GOOGLE_AI_API_KEY` (Gemini video) + ffmpeg en Vercel (`ffmpeg-static`+`FFMPEG_PATH`) para encender el modo live; e integrar `queueRunMedia`/`processRunMedia` en el runner cuando haya scraping real.

**Otros pendientes:** export PDF/PPT real · imágenes reales (Gemini) · auth/multi-tenancy + billing · conectar Comparativa/Galería a DB real · análisis por sección en modo live.

**Caveats:** mappers de Apify best-effort (ajustar por actor; ads community pueden cambiar schema → ya hay degrade/fallback) · runs largos corren síncronos en serverless (evaluar cola/Edge).

---

## 10. Cómo correr local

```bash
cp .env.example .env.local   # apunta al proyecto Supabase; agregar SERVICE_ROLE_KEY para el runner/test
npm install
npm run dev                  # http://localhost:3000
npm run build                # validación
npm run test:run-mock        # valida un run completo en modo mock (necesita SERVICE_ROLE_KEY)
```
