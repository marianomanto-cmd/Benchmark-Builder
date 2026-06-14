# Phatia — Estado de desarrollo (repo: Benchmark-Builder)

> Documento de contexto para consultar en otra conversación. Última actualización: 2026‑06‑14 (rediseño Claude Design: **wizard "Marco en vivo"** (split form + brief en vivo); **área de run**: Overview y FODA con **toggle de 4 vistas** + **vórtice** en "Qué hace" del home; monetización por **créditos**: config único + modal de suscripción + saldo en header/dashboard + asistente del run gasta créditos; directorio editable CRUD; orquestación Wizard Assistant/Haiku + Planner/QuerySpec + Grok web; wizard 3 pasos; seed multi-caso; actores automáticos). Producto: **Phatia** (repo: Benchmark-Builder).
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
  api/settings/sources/route.ts  POST → guarda config de fuentes (enabled + results_limit; actor_id=null, selección automática)
  api/wizard/assist/route.ts  **POST → asistente del wizard al "Siguiente" (mock=heurística, live=Haiku)**
  globals.css              Tokens light/dark (dark = default), escala editorial, lenis, marquee
  layout.tsx               ThemeProvider (defaultTheme=dark) + SmoothScroll + OG metadata
components/
  marketing/               **site-nav, hero-canvas, vortex-canvas (Qué hace), sources-marquee, what-it-does (vórtice), process,**
                           **deliverable, faq, site-footer, marketing.module.css, what-diagram.module.css (vórtice)**
  motion/                  **smooth-scroll (Lenis), reveal (whileInView)**
  screens/                 portal (compone marketing), portal-hero (cortina+canvas+box IA),
                           **home-wizard (wizard embebido)**, **subscription-modal (paywall de créditos)**, **user-dashboard / account-view / project-view (directorio)**,
                           overview, live-feed, comparativa, galeria,
                           **swot (FODA+estrategia)**, editor, report-pdf, runs, research-plan (legacy)
  ui/ (+ **segmented.tsx** toggle+persistencia, **radar-chart.tsx** SVG) tremor/ shell/ domain.tsx analysis-block.tsx command-palette.tsx run-button.tsx **run-assistant.tsx** theme-*
lib/
  platforms.ts             PLATFORM_KEYS (tuple) + PlatformKey (incluye **google_ads, linkedin_ads**)
  cost/                    **rates, estimate, config, ledger, guarded, alerts, index** (motor de costos)
  discovery/               **schema (Zod ResearchPlan + heurística + campos de marca), classify (Claude/mock), planner (QuerySpec acotado por fuente; heurística/Claude), jobs (planToJobs), suggest (heurística del wizard)**
  media/                   **types/config/download(TTL 12h)/frames(ffmpeg)/audio/analyze(Claude vision)/transcribe(Whisper)/consolidate/index/fixtures** (Task 2, mock-first, bajo guard)
  sources/                 types (+scope, +AdMeta), reddit, mastodon, bluesky, apify, **apify-ads**, meta-ads,
                           grok-x, index (**sourceFor(platform, scope)** + metaAdsOfficial), **select-actor (elección automática por caso)**
  runner.ts                **executeRun(slug, platforms?, keywords?, {scope, adIntent, plan})** — jobs organic+paid
  runner-fixtures.ts       **fixtures mock: demoRawMentions, demoAdMentions, demoScores, demoInsightDrafts**
  credits/                 **config.ts (FUENTE ÚNICA de la matemática: 1 cr = US$0,10, reporte = 120 cr, asistente = 2 cr, tiers Basic/Pro⭐/Marketer, helpers reportsFor/usdPerReport) + store.ts (saldo en localStorage `phatia_credits`, hook `useCredits` → balance/setCredits/addCredits/spend)** — monetización por créditos
  directory-store.ts       **directorio EDITABLE (localStorage `phatia_directory`): crear/borrar cuentas y proyectos, `useDirectory` (sembrado de los casos demo)**
  ai/ data.ts demo.ts **demo-cases.ts (registro multi-caso por slug)** **i18n.ts (ES/EN/PT)** **session.ts (auth sim) accounts.ts (cuentas→proyectos→runs)** view-models.ts database.types.ts supabase/ format.ts
scripts/                   **test-run-mock.ts, cost-check.ts** (tsx --conditions=react-server --env-file=.env.local)
supabase/migrations/       DDL versionado (incluye cost_controls, paid_platforms_enum, source_settings_scope, runs_research_plan)
.claude/skills/            Skills de marketing vendorizados
```

---

## 4. Modelo de datos (Supabase, schema public)

Base: **workspaces** (+`settings` jsonb) · **projects** (+`budget_monthly_usd`) · **competitors** · **competitor_platforms** · **mentions** (unique `project_id,platform,external_id`; ads usan `engagement.ad` + `metrics`) · **insights** · **run_sources** · **run_analysis**.

**runs** (+ nuevas cols): `budget_usd` (cap, default 30), `cost_estimated_low/high`, `cost_actual`, **`plan` (jsonb ResearchPlan)**, **`scope`** (organic/paid/both), **`ad_intent`** (commercial/political/mixed). (Quedan `cost_soft/cost_hard` legacy.)

**source_settings** — ahora **PK `(platform, scope)`**: `provider` (apify|meta_api|grok|reddit|mastodon|bluesky|web), `actor_id`, **`actor_build`** (version pin), **`fallback_actor_id`**, `enabled`, `results_limit`. **El actor ya NO lo maneja el usuario:** `/settings` sólo expone `enabled` + `results_limit`; el form guarda `actor_id=null`. La selección del actor es **automática por caso de estudio** (`lib/sources/select-actor.ts` → `selectActor`): precedencia *override de ops por env* → *catálogo por caso de estudio* (plataforma, scope, geo) → *connector default*. `actor_id` en DB queda como pin opcional de ops (si existe, gana). TikTok ads: EU-27+UK → Ads Library oficial, resto → Creative Center global.

**Control de costos (Task 1):**
- **system_flags** (`key` PK, `value` jsonb) — kill switch: `external_apis_enabled` (master) + `apify_enabled`, `anthropic_enabled`, `openai_enabled`, `brave_enabled`, `xai_enabled`, `meta_api_enabled`.
- **cost_ledger** (gasto comiteado: run/project/workspace, provider, operation, cost_usd, reservation_id, occurred_at).
- **pending_charges** (reservas: estimated_cost_usd, status reserved|committed|released|expired, expires_at).
- **run_steps** (timeline del CostMeter: label, provider, cost_usd, cumulative_usd, metadata).

**Medios (Task 2):** `media_files` (url, kind image/video/audio, status, `expires_at` 12h, idempotente por `project_id,url`) · `media_analysis` (summary "qué muestra", shows, ocr_text, **transcript "qué dice"**, language, sentiment, brand_safety, topics, model, cost_usd). RLS public read. Migración `20260613210000_media_pipeline.sql` (aplicada).

**RPCs:** `budget_spent_with_pending`, `reserve_budget` (lock por run `pg_advisory_xact_lock` FM-05; caps run/project-mensual/workspace-mensual; devuelve ok|soft(≥80%)|hard|error), `commit_charge` (idempotente), `release_charge`, `release_expired_charges`.

Enum `platform`: instagram, tiktok, youtube, facebook, x, reddit, mastodon, bluesky, web, meta_ads, **google_ads, linkedin_ads**. RLS `public read` en todas (escrituras = service role). **Auth/multi-tenancy sin definir** (pendiente).

**Créditos (monetización) — sin tabla aún:** el saldo vive **client-side** en `localStorage` (`phatia_credits`, hook `useCredits`) como stub mientras no hay billing. La matemática es **un solo lugar** (`lib/credits/config.ts`): `CREDIT_USD=0,10`, `REPORT_COST=120 cr`, `ASSISTANT_COST=2 cr`, y tiers Basic (US$60/600 cr ≈ 5 rep.), **Pro⭐ (US$200/2.400 cr ≈ 20 rep.)**, Marketer (US$450/6.000 cr ≈ 50 rep.). **Pendiente backend:** tablas de plan/saldo/transacciones + checkout real (Stripe) — hoy elegir un tier es un stub que carga el saldo y redirige al panel (`// TODO: reemplazar por checkout real`). Cancelación = reembolso de `créditos_restantes × US$0,10`.

---

## 5. Pipeline de ingesta + control de costos

`POST /api/runs { slug?, platforms?, keywords?, scope?, adIntent?, plan? }` → `lib/runner.ts executeRun`:
1. Resuelve un **ResearchPlan** (explícito del wizard, o derivado de platforms+scope+adIntent).
2. `planToJobs(plan, source_settings)` → **un job por `(plataforma × scope)`** (organic y/o paid según scope; enabled). El **actor de cada job se elige automáticamente por caso de estudio** vía `selectActor(platform, scope, plan)` (env override → catálogo → default); `source_settings.actor_id`, si existe, lo pisa.
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
- **Home**: **video de fondo inmersivo GLOBAL** (Grok, 960×960 @ ~2.7 Mbps CRF 20, muteado, ~6.9 MB; `site-bg.tsx` crossfade sin cortes detrás de hero/wizard/run, fijo z-index -1) con scrim de legibilidad. *(El source original se re-comprimió a alta calidad tras quedar borroso un intento previo a 766 kb/s; `hero-canvas.tsx` queda como alternativa nítida sin video.)* **Sin cortina**: al cargar ves la animación y a ~2.5s ("inmersión") aparecen tagline + box. Marquee de fuentes, "qué hace", proceso, showcase del reporte, FAQ, footer. Smooth scroll (Lenis) + reveals; `prefers-reduced-motion`, focus-visible, AA.
- Componentes del dashboard migrados a tokens semánticos (no rompen en dark). **Responsive** desde la home (nav mobile, type fluida, grillas que colapsan).
- **Pase cosmético global** (vía tokens): radios más suaves (`--r-*`), **sombras visibles en dark** (`--sh-*`), scrollbars finos temáticos, `::selection` con acento, y hover/active consistente en botones (`.bb-btn`).

---

## 7. Pantallas / rutas

`/` portal + **wizard de research embebido en el home** (paso a paso asistido por IA: marca → mercados → competidores → orgánico/paid → descartes → fechas → costo; botón "no sé, sugerime" + validación por paso) · `/overview` dashboard **con toggle de 4 vistas (Informe/Cockpit/Posiciones/Spread, `?view=`)** · `/live-feed` · `/comparativa` · `/galeria` (orgánico vs pago) · **`/swot` (FODA con toggle de 4 instrumentos: Matriz 2×2 / Impacto·Control / Radar / Roadmap, `?foda=`)** · `/editor` · `/reporte` · `/runs` · `/settings` · `/not-found`. El shell del run trae un **asistente flotante** (consulta IA acotada a los resultados, **descuenta 2 créditos por consulta**; sin saldo invita a cargar un plan; si la pregunta se va de alcance, invita a iniciar una nueva investigación) y un **pill de saldo de créditos** en el header (link al panel). Al **cerrar el wizard sin sesión** aparece el **modal de suscripción** (3 planes; ver §9). Todo **responsive** (sin scroll horizontal). `/research-plan` queda como ruta legacy. Extras: ⌘K, transiciones, skeletons.

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

**UX overhaul (sesión 13/jun):** fix de **scroll** (Lenis acotado a `/`, `min-height:0` en el shell) · **pase responsive/mobile** (guard global anti scroll-horizontal + helpers `.bb-collapse/.bb-row/.bb-scroll-x/.bb-hide-sm`, grids a auto-fit) · **wizard embebido en el home** (7 pasos asistidos por IA, **datos de marca** para análisis comparativo, sugerencias y validación mock-safe en `lib/discovery/suggest.ts`, costo visible) · **tab FODA & Estrategia** (`/swot`) · **asistente flotante** del run · limpieza del shell (sin lupa `/research-plan`, sin tabs obsoletos) · **medios reales** en galería/feed (fotos + videos, placeholders libres Picsum/Google samples a swappear por scrapeo) · **aurora ambiental** animada en el home · **runs de varias marcas** en el historial · **Proyectos como carpetas** (`/proyectos`, agrupan runs) · **hero con imagen inmersiva** (Grok) animada sutil (Ken Burns + parallax) · **media pipeline mock** con análisis "qué muestra/qué dice" en galería · **mobile del run** con hamburguesa + drawer · **editor de reporte FUNCIONAL** (bloques: título/subtítulo/párrafo/cita/KPI/lista/gráfico/**tabla**; edición inline al clickear; índice navegable; vista previa; **export PDF** vía print; autosave en localStorage) · **live-feed interactivo** (filtros que togglean competidores/plataformas/sentimiento/tipo + orden por engagement + **descarga CSV**) · **comparativa** con **descarga CSV** · **video de fondo GLOBAL** (Grok, **crossfade** sin cortes, detrás de hero/wizard/run; **sin cortina**) · **superficies glass** (estilo giga) · **rename a Phatia** + **logo con glow** + favicon · **seed ampliado** (más runs y proyectos variados) · **botones cableados** (PDF/Generar reporte/Insertar en reporte/Modo presentación).

**UX overhaul (sesión 14/jun):** **wizard compactado a 3 pasos + confirmación** (1·Tu marca, 2·Competencia [mercados+competidores+descartes], 3·Alcance [scope+**redes**+ventana], 4·Confirmar); **selección de redes/fuentes** con toggles (todas activas por defecto, ícono+nombre, incluye **"Portales"** de noticias y **"Web"**); **ventana de tiempo con rango exacto** (fechas desde/hasta) además de presets; el costo reacciona a redes y ventana · **home sin** botones "Análisis guiado/general" · **seed multi-caso REAL** (`lib/demo-cases.ts`): cada run/proyecto mapea a un `slug` de caso (Copa/Cartagena, Belleza Natura vs L'Oréal, Moda Zara vs H&M, Fintech Ualá vs Brubank, Deportiva Nike vs adidas, Café especialidad) con SUS marcas, menciones, comparativa, galería y FODA — ya **no todo es Copa**. El caso se transporta por `?case=<slug>` y el `ScreenShell` lo propaga entre tabs del run (overview→live-feed→comparativa→galería→FODA); overview deriva charts/KPIs del caso; comparativa/galería/FODA pasaron a **prop-driven** desde el registro · etiqueta `X / Grok` → `X` (no revelar motor).

**Orquestación (sesión 14/jun) — ver `docs/orchestration.md`:** pipeline modularizado punto a punto, **mock-first / costo cero** (cada modelo gateado por `pipelineMode` + flag + key). (1) **Wizard Assistant** al tocar "Siguiente" (`/api/wizard/assist`): mock = heurística, live = **Haiku**; detecta respuestas vagas y guía sin bloquear. (2) **Planner** (`lib/discovery/planner.ts`): interpreta el caso (+ perfil) → **`QuerySpec` tipado (Zod) acotado por fuente** (no el prompt crudo); heurística por defecto, **Claude** refina en live; el runner usa esas keywords por job. (3) **Data Collection**: **Grok Live Search** para X **y web/portales** (`grok-live.ts`, mapea los toggles Web/Portales), Apify para IG/TT/YT/FB + ad-libraries (actor automático por caso). (4) **Multimodal**: hoy frames+Claude vision+Whisper; **Gemini (video nativo) + AssemblyAI (voiceover) = MUST futuro** (costuras listas para swap). (5) **Synthesis**: Claude (Grok opcional). **Perfiles de cliente** = futuro; el Planner ya acepta `ClientProfile`.

**i18n (ES/EN/PT) (sesión 14/jun):** base liviana en `lib/i18n.ts` (dicc. plano + `t()`), `I18nProvider` (cookie `phema_locale` + localStorage; SSR lee la cookie en `layout.tsx` y setea `<html lang>`), **selector de idioma** (`components/language-select.tsx`) en el **header del shell** y en la **nav del landing** (`router.refresh()` al cambiar). **Traducido:** landing público (nav, hero, process/diagrama, faq, footer, testimoniales) + frame de la app (sidebar/header) + **wizard completo** (incl. asistente en `suggest.ts`) + **Settings**, **Editor de reporte** (chrome), **command palette**, **asistente flotante** y **404**. `ScreenShell` traduce breadcrumbs con prefijo `@`. **Decisión:** las **pantallas del run + contenido seed** (overview/live-feed/comparativa/galería/FODA y `demo.ts`/`demo-cases.ts`) **NO** se traducen — son seed y a futuro heredan el idioma del usuario por defecto.

**Home + wizard + viz (sesión 14/jun c):** **paleta de gráficos** coherente — nuevo `--viz-accent` (gold) para data-viz (charts/diagrama/cliente) separado del accent de marca (sangría sigue en chrome); se sacó el coral. **Sección "Qué hace"** = diagrama SVG animado (ruido → constelación → "una lectura"), determinista (SSR-safe), loop, reduced-motion, traducible (`what.*`). **Sección de testimoniales** (clientes ficticios, marquesina auto-scroll, foto+nombre+rol+LinkedIn de demo, `testi.*`). **Asistente del wizard = globos "tipo mención"** anclados a cada campo (no popup): al 1er "Siguiente" salen las recomendaciones desde los campos; si se ignoran, el 2º click avanza. Recomendaciones/sugerencias **context-aware** (usan marca+desc+problema+competidores ⇒ competidores sugeridos on-category). i18n del wizard en `suggest.ts` (`assistFor`/`recommendationsFor` con `locale`, recs ahora `{field,text}`).

**Arquitectura de usuario (sesión 14/jun d):** **sesión simulada** (`lib/session.ts` + `SessionProvider`, cookie `phema_session`; auth real Google/signup = futuro). Usuario fake "Mariano Manto" con login/logout y menú en el header. **Modelo de directorio** (`lib/accounts.ts`): **Cuentas (clientes) → Proyectos → Runs**, derivado de los casos seed. **Dos homes** (branch por cookie en `app/page.tsx`): sin sesión → marketing con hooks/taglines + CTA "Comencemos" (abre el wizard; al terminar el 1er reporte se "crea la cuenta" vía `signIn`), **sin prompt box**; con sesión → hero con prompt box + **dashboard compacto** de cuentas (+ "ver todo" → `/dashboard`). **`/dashboard`** = vista de usuario completa (KPIs, marquesina de citas, grilla de cuentas, actividad reciente). **Navegación jerárquica respetada:** dashboard → **`/cuenta/[slug]`** (lista los proyectos de la cuenta) → **`/proyecto/[slug]`** (lista los runs del proyecto) → **`/overview?case=`** (el run). Nada de saltar de cuenta directo a un run. **Sidebar contextual** (`ScreenShell nav`): dentro de un run = tabs del run (sin "Proyectos"); fuera = "Mi panel". Todo trilingüe (`dash.*`, `home.*`, `nav.*`). **Pendiente:** auth real (Google/signup) + billing + multi-tenancy en DB.

**Wizard "Marco en vivo" (Claude Design, sesión 14/jun g):** rediseño de `home-wizard.tsx` a un **modal split** (grid `1fr / 330px`, colapsa a 1 col < 960px): a la izquierda el formulario por paso, a la derecha el **"Marco del run · en vivo"** que se arma en tiempo real (Marca en serif, Qué hacen, chips de Mercados/Competidores/Descartes con pop, Inversión/mes, Alcance y ventana) con indicador "● en vivo" pulsante. Mismos **4 pasos** (Tu marca · Competencia · Alcance · Confirmar) y campos; stepper done/active. La ayuda de IA pasó de los globos-mención a un botón **"Sugerime" por campo** (loading ~700ms → inyecta chips de `suggestFor`, context-aware). **Costo del run** = última línea del brief, **reconciliado con el modelo de créditos** (decisión reciente del usuario, NO US$): logueado → `120 créditos` + saldo + saldo restante / "saldo insuficiente"; sin sesión → `120 créditos · elegí un plan al lanzar`. CTA "Lanzar run" → mismo `onLaunch` (paywall si sin sesión/sin saldo; si no, gasta y ejecuta). i18n `wizard.qt*/brief.*/btn.launch/sugHelp/confirmHelp` (ES/EN/PT). *(El handoff pedía el estimado en US$ variable; se priorizó la decisión de créditos del usuario — si se quiere el US$ variable, avisar.)*

**Rediseño del área de run + vórtice (Claude Design, sesión 14/jun f):** handoff de alta fidelidad recreado con los componentes/tokens del repo (no copia del HTML). (1) **Home › "Qué hace" = el vórtice** (`vortex-canvas.tsx` + `what-it-does.tsx` + `what-diagram.module.css`): las señales espiralan a un **núcleo incandescente** (guiño al logo) con el insight encendido en el centro; Canvas 2D (dpr≤2, pausa offscreen vía IntersectionObserver, estático en reduced-motion); grid 2 col (copy izq + vórtice 420px der); núcleo HTML con tag/insight/3 mini-barras; i18n `what.vEyebrow/vTitle/vEm/lead/coreTag/coreHead`. **No toca** el fondo global. (2) **Overview con toggle de 4 vistas** (`Segmented` + `useToggleView`, persiste en `?view=` + `localStorage('bb:overview-view')`, default **cockpit**): **Informe** (narrativa: headline+body+recos del análisis + stat-strip + barras SOV) · **Cockpit** (bento: dona SOV con total al centro, volumen apilado, KPI tiles, insights, área de tendencia — reusa Tremor) · **Posiciones** (leaderboard rankeado con avatar/SOV/sparkline/sentimiento + rail "Lectura/Movés primero") · **Spread** (editorial: título serif + pull-quote + stat-line + barras full-width con anotaciones absolutas desde los insights). (3) **FODA con toggle de 4 instrumentos** (`?foda=` + `localStorage('bb:foda-view')`, default **matriz**): **Matriz 2×2** (cuadrantes por eje interno/externo × positivo/negativo) · **Impacto/Control** (plano con 4 zonas + burbujas derivadas de la matriz de acción, pop escalonado) · **Radar** (`radar-chart.tsx`, 6 ejes Copa vs líder; valores **exactos del handoff** para Copa y **derivados de las marcas** para los demás casos vía `deriveRadar`; lectura S/W/O/T que mapea la forma del polígono) · **Roadmap** (gantt carril×horizonte; lanes Orgánico/Paid/Reputación/Medición derivadas por keyword de las recomendaciones por horizonte). Las 4 vistas de cada pantalla consumen **la misma data del caso**; el toggle preserva `?case=`. Transición con fade corto (`motion/react`).

**Directorio editable + Monetización por créditos (sesión 14/jun e):** **CRUD del directorio** (`lib/directory-store.ts`, `localStorage` + evento de sync, sembrado de los casos demo): crear/borrar **cuentas** y crear/borrar **proyectos** desde `/dashboard`, `/cuenta/[slug]` y `/proyecto/[slug]` (`useDirectory`). **Modelo de créditos** (`lib/credits/config.ts` = fuente única; nada hardcodeado en la UI): 1 crédito = **US$0,10**, **reporte = 120 cr**, **asistente del run = 2 cr/consulta**; 3 planes (Basic US$60/600 cr, **Pro⭐ US$200/2.400 cr**, Marketer US$450/6.000 cr) con helpers `reportsFor`/`usdPerReport`. **Saldo** en `localStorage` (`useCredits`), visible como **pill en el header del shell** y como **KPI "Créditos"** del dashboard (reemplaza "Gasto total US$" — el consumo se desacopla del signo $). **Modal de suscripción** (`components/screens/subscription-modal.tsx`): al **terminar el wizard sin sesión** (o sin créditos suficientes), el botón "Aprobar y ejecutar" abre un paywall de 3 columnas (Pro destacado; cada card: nombre, precio/mes, créditos/mes, ≈N reportes, precio efectivo por reporte, CTA; línea "Cancelá cuando quieras. Te devolvemos los créditos que no usaste."). Elegir un tier = **stub**: `signIn()` + carga el saldo del plan + redirige a `/dashboard` (`// TODO: reemplazar por checkout real`). **Paso de confirmación del wizard:** se sacó el bloque de costo en **US$**; **sin sesión NO se muestra estimación** (la monetización la maneja el paywall, sólo una nota "elegí un plan"), y **logueado** se muestra la estimación en **créditos a consumir** (120 cr del reporte + saldo actual + saldo restante; si no alcanza, "Saldo insuficiente — elegí un plan"). El **asistente flotante del run** descuenta 2 cr por consulta y, sin saldo, responde invitando a cargar un plan. Trilingüe (`credits.*`, `sub.*`). **Pendiente:** auth/billing real + tablas de plan/saldo/transacciones + checkout (Stripe).

**Política de etiquetado del análisis (IMPORTANTE):** el análisis se produce con **Grok + Claude + los skills de marketing del repo** (`.claude/skills`), pero la **UI NUNCA lo revela** — no nombra el motor ni dice "IA"; sólo muestra **"Análisis + Insights"**. Mantener esta regla en todo texto user-facing nuevo.

**Pendiente (próximo):**
1. ✅ **Deploy de Vercel — resuelto** (§0): el `vercel.json` tenía un cron `*/5` no permitido en Hobby (Vercel rechazaba toda deployment `032332e`+); se pasó a cron **diario** y `main` vuelve a deployar.
2. **Actores ya NO los maneja el usuario** — se eligen solos por caso de estudio (`select-actor.ts`). Pendiente de ops: validar/pinear los slugs reales del catálogo (Google/LinkedIn/TikTok) y, si se quiere, fijar overrides por env (`APIFY_ACTOR_<PLATFORM>[_<SCOPE>]`).
3. ✅ **Task 2 — pipeline de medios (mock-first hecho):** tablas `media_files`/`media_analysis` (migradas) + `lib/media/` (download TTL 12h, extractFrames ffmpeg, extractAudio, analyzeImage/Frame Claude vision + Zod, transcribe Whisper, consolidate, index idempotente **bajo guard**, fixtures); galería muestra "qué muestra / qué dice". **Pendiente (solo keys):** `OPENAI_API_KEY` (Whisper) y/o `GOOGLE_AI_API_KEY` (Gemini video) + ffmpeg en Vercel (`ffmpeg-static`+`FFMPEG_PATH`) para encender el modo live; e integrar `queueRunMedia`/`processRunMedia` en el runner cuando haya scraping real.

**Otros pendientes:** **Multimodal producción: Gemini (video nativo) + AssemblyAI (voiceover) — MUST** (ver `docs/orchestration.md`) · **perfiles de cliente** (`client_profiles`: que un marketer guarde marcas y no recargue todo en cada run) · export PDF/PPT real · auth/multi-tenancy + billing · conectar Comparativa/Galería a DB real · análisis por sección en modo live.

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
