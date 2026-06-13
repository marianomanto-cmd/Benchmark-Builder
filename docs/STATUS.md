# Benchmark Builder — Estado de desarrollo

> Documento de contexto para consultar en otra conversación. Última actualización: 2026‑06‑13.
> App de **research competitivo y social listening asistido por IA**. Caso demo: **Copa Airlines vs Avianca / LATAM / Wingo / Arajet · ruta Cartagena**.
>
> ⚠️ **Mantené este documento actualizado en cada cambio** (regla en `AGENTS.md` → "Documentation discipline"). Un cambio no está terminado hasta que la doc lo refleja.

---

## 0. ⚠️ Situación de deploy (acción pendiente del usuario)

- El código está **correctamente pusheado a `main` en GitHub** (HEAD `ff5d847`, rama por defecto `main`). Repo: `marianomanto-cmd/Benchmark-Builder`.
- **Vercel NO está deployando los commits nuevos de `main`**: su último build quedó en `1d5b542` (anterior a toda la tanda de cambios). Un commit vacío de prueba (`e7433c7`) tampoco disparó build → el auto-deploy de `main` está desconectado o la *Production Branch* no es `main`.
- **A revisar en Vercel:** Settings → Git → repo conectado + *Production Branch* = `main`; pestaña Deployments (¿hay builds *Failed* posteriores a `1d5b542`?); Ignored Build Step. Si hay build fallido, traer el log.
- El plugin de Vercel↔Claude se conectó pero sus tools **aún no aparecían** en la sesión donde se trabajó; abrir **sesión nueva** para que carguen y poder inspeccionar deployments/logs desde Claude.

Commits de la sesión (todos en `main`): `032332e` Task 1 costos · `91874f9` rediseño · `18588c7` cortina · `e7433c7` redeploy · `ff5d847` actores/discovery.

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
  api/cron/cost/route.ts   **GET → libera reservas vencidas + checkCostAlerts (Vercel Cron 5min)**
  api/discovery/route.ts   **POST → infiere ResearchPlan del prompt**
  api/settings/sources/route.ts  POST → guarda config de fuentes (por platform,scope)
  globals.css              Tokens light/dark (dark = default), escala editorial, lenis, marquee
  layout.tsx               ThemeProvider (defaultTheme=dark) + SmoothScroll + OG metadata
components/
  marketing/               **site-nav, hero-canvas, sources-marquee, what-it-does, process,**
                           **deliverable, faq, site-footer, marketing.module.css**
  motion/                  **smooth-scroll (Lenis), reveal (whileInView)**
  screens/                 portal (compone marketing), **portal-hero (cortina+canvas+box IA)**,
                           overview, live-feed, comparativa, galeria, research-plan (wizard), editor, report-pdf, runs
  ui/ tremor/ shell/ domain.tsx analysis-block.tsx command-palette.tsx run-button.tsx theme-*
lib/
  platforms.ts             PLATFORM_KEYS (tuple) + PlatformKey (incluye **google_ads, linkedin_ads**)
  cost/                    **rates, estimate, config, ledger, guarded, alerts, index** (motor de costos)
  discovery/               **schema (Zod ResearchPlan + heurística), classify (Claude/mock), jobs (planToJobs)**
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

**RPCs:** `budget_spent_with_pending`, `reserve_budget` (lock por run `pg_advisory_xact_lock` FM-05; caps run/project-mensual/workspace-mensual; devuelve ok|soft(≥80%)|hard|error), `commit_charge` (idempotente), `release_charge`, `release_expired_charges`.

Enum `platform`: instagram, tiktok, youtube, facebook, x, reddit, mastodon, bluesky, web, meta_ads, **google_ads, linkedin_ads**. RLS `public read` en todas (escrituras = service role). **Auth/multi-tenancy sin definir** (pendiente).

---

## 5. Pipeline de ingesta + control de costos

`POST /api/runs { slug?, platforms?, keywords?, scope?, adIntent?, plan? }` → `lib/runner.ts executeRun`:
1. Resuelve un **ResearchPlan** (explícito del wizard, o derivado de platforms+scope+adIntent).
2. `planToJobs(plan, source_settings)` → **un job por `(plataforma × scope)`** (organic y/o paid según scope; enabled).
3. **Estimación** (`estimateRunCost`) desde esos jobs → `cost_estimated_low/high` en el run.
4. Cada job pasa por **`guardedCall`** (orden: `isApiEnabled` → reserva `reserveBudget` → llamada con timeout + reintentos acotados → `commitCharge`/`releaseCharge`; escribe `run_steps`+`cost_ledger`).
5. Routing paid: comercial → scrapers Apify; **político → además API oficial de Meta** (gasto/impresiones) si `meta_api_enabled`+token; fallos **degradan** (no rompen). Ads normalizados a `mentions` (is_ad + `engagement.ad`).
6. Sentimiento (Claude) + agregados + insights (Claude), todo bajo guard. Finaliza con `cost_actual` desde el ledger.

**Modo de ejecución — `PIPELINE_MODE` (default `mock`):**
- **mock**: conectores e IA devuelven **fixtures deterministas**; igual pasan por reserve/commit con **costo simulado** (valida el flujo completo a **costo cero**). Reemplaza al viejo `LIVE_RUN`.
- **live**: una llamada paga ocurre **solo si las 3 condiciones simultáneas**: `PIPELINE_MODE=live` **y** flag del proveedor en `system_flags` **y** API key presente. Si falta cualquiera → no se gasta (fixture).
- Crons: `GET /api/cron/cost` (Vercel Cron */5) y `npm run cost:check` liberan reservas vencidas + alertas (run>$50, provider>$100/día, aceleración >5×).
- Validación: `npm run test:run-mock` (requiere `SUPABASE_SERVICE_ROLE_KEY` local) — re-run sin duplicar costos, kill-switch corta en <60s, total == estimación. RPCs validadas vía SQL.

**Discovery (prompt → plan):** `lib/discovery` — `classifyPrompt` (Claude en live / **heurística determinista en mock**, costo cero) → `ResearchPlanSchema` (Zod). Señales: paid = "anuncios/publicidad/campañas/pauta"; organic = "qué se dice/conversación/sentimiento"; político = candidato/elección/partido. El wizard lo usa para pre-seleccionar scope/ad_intent.

---

## 6. Diseño / theming (rediseño fourmula)

- **Dark por defecto** (toggle claro). Paleta `.dark`: `--bg #0A0810`, `--surface #15131C/#1C1924`, texto `#F4F1EA/#8C8696/#5A5563`, **`--accent #F23A5E`** (sangría brillante), `--accent-ink`. Tema claro conserva sangría `#6B1A36`.
- Escala editorial (`.t-hero`, `.t-section`, `.t-eyebrow`, `.t-lead`) con Newsreader gigante. `--series-*` monocromo + cliente en acento; Tremor `ink/sangria` con variantes `dark:` al nuevo acento.
- **Home**: cortina de intro (tagline + campo de partículas Canvas 2D moviéndose detrás + contador 0→100% que **sube** y revela el box IA), marquee de fuentes, "qué hace" (swap before/after), proceso 01–04, showcase del reporte, FAQ, footer interactivo. Smooth scroll (Lenis) + reveals; `prefers-reduced-motion`, focus-visible, AA.
- Componentes del dashboard migrados a tokens semánticos (no rompen en dark). **Responsive** desde la home (nav mobile, type fluida, grillas que colapsan).

---

## 7. Pantallas / rutas

`/` portal (rediseño + cortina) · `/research-plan` wizard (con toggle **orgánico/paid** + discovery + delta de costo) · `/overview` dashboard · `/live-feed` · `/comparativa` · `/galeria` (orgánico vs pago) · `/editor` · `/reporte` · `/runs` · `/settings` (actores por `platform,scope`) · `/not-found`. Extras: ⌘K, transiciones, skeletons.

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

**Hecho:** rediseño fourmula (dark default, home con cortina+box IA, responsive, 404, OG placeholder) · **Task 1 motor de costos** (estimate, reserva atómica, guardedCall, kill-switch, ledger/run_steps, crons, mock end-to-end costo cero) · **actores Apify orgánico/paid + discovery por prompt** (registry por `platform,scope`, planToJobs, routing comercial/político, wizard toggle + delta) · 7 pantallas + portal + wizard + runs + settings · pipeline de ingesta.

**Pendiente (próximo):**
1. **Arreglar el deploy de Vercel** (§0) — bloqueante para que el usuario vea los cambios.
2. **Validar/pinear actores community** (Google/LinkedIn) en Vercel (slugs reales + build pin).
3. **Task 2 — pipeline de medios** (imagen/video/voiceover): tablas `media_files`/`media_analysis`, `lib/media/` (download con borrado a 12h, extractFrames ffmpeg, extractAudio, analyzeImage/Frame con Claude vision + Zod, transcribe Whisper/captions, consolidate), todo idempotente, acotado y **bajo guard**; fixtures mock; render en `/galeria`. (Era el paso post-actores del plan.)

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
