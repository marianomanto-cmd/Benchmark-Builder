# Benchmark Builder — Estado de desarrollo

> Documento de contexto para consultar en otra conversación. Última actualización: 2026‑06‑13.
> App de **research competitivo y social listening asistido por IA**. Caso demo: **Copa Airlines vs Avianca / LATAM / Wingo / Arajet · ruta Cartagena**.

---

## 1. Resumen del producto

Un operador (agencia/marca) crea **runs** de research. Cada run define un marco (problema de negocio, competidores, alcance/fechas), la app estima el costo, ejecuta scraping + análisis con IA, y produce un **dashboard** (KPIs, charts, feed de menciones, comparativa, galería orgánico/pago) con un **bloque de análisis protagonista por sección** (headline + key takeaways + recomendaciones). Los runs quedan guardados y revisitables.

**Flujo:** Portal de bienvenida (`/`) → campo IA "¿Qué querés investigar hoy?" → **Wizard** (4 pasos) → estimación de costo → ejecutar run → **Dashboard** (`/overview` + secciones). Historial en `/runs`.

---

## 2. Stack e infraestructura

| Capa | Tecnología |
|---|---|
| Framework | **Next.js 16** (App Router, Turbopack), React 19, TypeScript estricto |
| Estilos | **Tailwind CSS v4** (CSS-first) + design tokens en `app/globals.css` |
| Fuentes | Geist · JetBrains Mono · Newsreader (`next/font`) |
| UI | Componentes propios (inline-styles + tokens) + **Tremor** (charts/table, vendorizado en `components/tremor/`) + foundation shadcn (`components.json`, `lib/utils` cn) |
| Tema | **next-themes** (light/dark, default light) con tokens semánticos |
| Animación | **motion** (Framer Motion) |
| Backend | **Supabase** (Postgres + Auth + RLS). Project ID: `wjexqyliwwsxjdujgwjo` |
| IA | **Anthropic Claude** (`claude-opus-4-8`, default) vía `@anthropic-ai/sdk`; **xAI Grok** opcional (`AI_PROVIDER=grok`) |
| Scraping | **Apify** (IG/TikTok/YouTube/FB/Web), **Grok live search** (X), **Meta Ad Library** (oficial), **Reddit/Mastodon/Bluesky** (APIs públicas) |
| Deploy | **Vercel** (push a `main` deploya). Repo: `marianomanto-cmd/Benchmark-Builder`. Branch de trabajo = `main`. |

---

## 3. Estructura del repo

```
app/
  page.tsx                 Portal de bienvenida (/)  [dinámico]
  overview/page.tsx        Dashboard Overview (/overview)  [dinámico]
  live-feed/ comparativa/ galeria/ research-plan/ editor/ reporte/ runs/   (rutas de pantallas)
  research-plan/page.tsx   Wizard de intake (Suspense)
  runs/page.tsx            Historial de runs
  api/runs/route.ts        POST → dispara un run (executeRun)
  api/settings/sources/route.ts   POST → guarda config de fuentes
  globals.css              Tokens (light/dark), tipografías, shimmer, dark variant
  layout.tsx               ThemeProvider + fuentes
  overview|live-feed/loading.tsx   Skeletons de marca
components/
  screens/                 portal, overview, live-feed, comparativa, galeria,
                           research-plan (wizard), editor, report-pdf, runs
  ui/                      primitives (Btn, KPI, Field, Toast, Skel, BBBadge, SentimentChip),
                           icons, charts (BBBarChart/Sparkline legacy)
  tremor/                  AreaChart, BarChart, DonutChart, LineChart, Table + utils
  shell/screen-shell.tsx   Sidebar + topbar + ⌘K + theme toggle + nav
  domain.tsx               PlatformBadge, MentionCard, CompetitorCard, InsightCard,
                           AlertCard, CostMeter, MediaThumb, MiniInsight
  analysis-block.tsx       Bloque de análisis protagonista (headline+takeaways+recs)
  command-palette.tsx      ⌘K
  run-button.tsx           Dispara /api/runs (slug, platforms, keywords)
  theme-provider.tsx / theme-toggle.tsx
lib/
  platforms.ts             PLATFORMS, tipos (PlatformKey, SentimentKind, ThumbKind, InsightKind)
  format.ts                Numerales es-AR
  view-models.ts           VMs (CompetitorVM, MentionVM, InsightVM, RunVM, AnalysisVM, OverviewData)
  demo.ts                  Datos demo (fallback resiliente)
  data.ts                  Fetch server-side (con fallback a demo): getOverviewData,
                           getMentions, getRecentRuns, getRuns, getSectionAnalysis
  database.types.ts        Tipos generados de Supabase
  runner.ts                executeRun(slug, platforms?, keywordOverride?) — orquesta el run
  sources/                 types, reddit, mastodon, bluesky, apify, meta-ads, grok-x, index (registry)
  ai/                      claude.ts, grok.ts, index.ts (selector AI_PROVIDER)
  supabase/                client.ts (browser), server.ts (RSC), middleware.ts, admin.ts (service role)
proxy.ts                   Refresh de sesión Supabase (Next 16 'proxy' convention)
supabase/migrations/       DDL versionado · supabase/seed.sql
design/                    Contrato visual original (HANDOFF.md, tokens.css, mocks)
.claude/skills/            Skills de marketing vendorizados (ai-marketing-skills, marketingskills)
```

---

## 4. Modelo de datos (Supabase, schema public)

- **workspaces** (id, name, slug, brand_color)
- **projects** (id, workspace_id, name, slug, period_days, status, **keywords[], geo[], languages[]**)
- **competitors** (id, project_id, name, handle, brand_letter, **accent** (token `var(--series-*)`), is_client, mentions, engagement_total, reach_estimate, sov, sentiment, sort_order, **targets[]**) · unique(project_id, handle)
- **competitor_platforms** (competitor_id, platform, sort_order)
- **mentions** (id, project_id, competitor_id, platform, author, handle, ts_label, brand, body, sentiment, is_ad, thumb_type, **external_id, url, published_at, engagement(jsonb), run_id**, metrics(jsonb), sort_order) · unique(project_id, platform, external_id)
- **insights** (id, project_id, run_id, kind(opp/thr/pat/ano), title, body, sources, confidence, sort_order)
- **runs** (id, project_id, number, cost_used, cost_soft, cost_hard, status, started_at, finished_at, mentions_count, error)
- **run_sources** (run_id, platform, status, mentions_count, cost, error)
- **source_settings** (platform PK, actor_id, enabled, results_limit) — editable desde `/settings`
- **run_analysis** (project_id, section, headline, body, takeaways[], recommendations[], run_id) · unique(project_id, section)

Enums: `platform`, `sentiment_kind`, `insight_kind`, `thumb_kind`, `project_status`.
**RLS:** habilitada en todas, con policy `public read` (lectura pública para la demo; escrituras requieren service role). El modelo de **auth/multi-tenancy está sin definir** (HANDOFF §10) — decisión pendiente.

Datos seed cargados: 1 workspace (Copa), 1 project (cartagena-q2-2026), 5 competidores, 18 menciones, 3 insights, 1 run (#42), source_settings (10), run_analysis (overview, comparativa, live-feed, galeria).

---

## 5. Pipeline de ingesta (runner)

`POST /api/runs { slug?, platforms?, keywords? }` → `lib/runner.ts executeRun`:
1. Cliente admin (service role). Carga project, competitors, source_settings.
2. Por cada plataforma habilitada: adapter en `lib/sources/` → scrapea (handles de competidores + keywords). Apify resuelve actor desde `source_settings` (DB > env > default). X usa Grok live search (scope neutral, perspectiva del cliente, sin cuenta personal).
3. Sentimiento con Claude/Grok (`lib/ai`).
4. Upsert de menciones (dedup por external_id), recálculo de agregados de competidores, regeneración de insights, costo y estado del run.
- **Sin credenciales, cada fuente se marca `skipped`** y la UI muestra el caso demo → el deploy nunca se rompe.

---

## 6. Diseño / theming

- **Tokens semánticos** en `globals.css`: `--bg, --surface, --surface-2, --border, --border-strong, --text, --text-muted, --text-faint, --accent, --accent-soft` + `--series-1..4, --series-client` (data-viz theme-aware). Bloque `.dark` espeja la paleta cálida (stone) del HANDOFF.
- Marca: **sangría (#6B1A36)** + neutros stone. Tremor charts tienen variantes `dark:` (paleta `ink/graphite/taupe/sand/sangria`).
- Identidad editorial (Newsreader en headlines/reporte). Default **light**; **dark** activable con toggle ☾ (rollout completo en las 7 pantallas).

---

## 7. Pantallas / rutas

| Ruta | Pantalla | Estado |
|---|---|---|
| `/` | Portal de bienvenida (animado, campo IA, runs recientes) | ✅ |
| `/research-plan` | **Wizard** (problema → competidores+magnitud → alcance/fechas → estimación) | ✅ |
| `/overview` | Dashboard: análisis IA + KPIs + Bar/Donut/Area (Tremor) + insights + cost + competidores | ✅ |
| `/live-feed` | Stream de menciones + filtros | ✅ (dark) · análisis: seed en DB, falta render |
| `/comparativa` | Matriz competidor × métrica | ✅ (dark) · análisis: seed en DB, falta render |
| `/galeria` | Orgánico vs pago (Meta Ad Library) | ✅ (dark) · análisis: seed en DB, falta render |
| `/editor` | Editor de reporte (3 columnas, hoja blanca) | ✅ (dark) |
| `/reporte` | Reporte PDF (deliverable, página US Letter) | ✅ (dark visor) |
| `/runs` | Historial de runs | ✅ |
| `/settings` | Fuentes y actores de Apify editables | ✅ |

Extras: **⌘K command palette**, transiciones de ruta (fade), skeletons de carga, navegación real en topbar.

---

## 8. Variables de entorno / API keys

Cargar en **Vercel → Settings → Environment Variables** (documentadas en `.env.example`):

| Var | Estado | Para qué |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | auto (integración Supabase↔Vercel) | cliente Supabase (públicas) |
| `SUPABASE_SERVICE_ROLE_KEY` | **verificar/cargar** | escritura del runner |
| `ANTHROPIC_API_KEY` | tengo la key, **cargar en Vercel** | IA (Claude) |
| `XAI_API_KEY` (+ `XAI_MODEL=grok-3`) | tengo la key, **cargar en Vercel** | X vía Grok |
| `APIFY_TOKEN` | tengo la key, **cargar en Vercel** | scraping |
| `META_AD_LIBRARY_TOKEN` | **falta conseguir** | anuncios Meta |
| `GOOGLE_AI_API_KEY` (Gemini/nano-banana) | **falta conseguir** | generar imágenes |
| `AI_PROVIDER` (claude/grok), `RUN_TRIGGER_SECRET` | opcionales | — |

Reddit/Mastodon/Bluesky no requieren key.

---

## 9. Hecho vs pendiente

**Hecho:** 7 pantallas + portal + wizard + runs; design system light/dark; Tremor charts; pipeline de ingesta completo (adapters + runner + IA, listo para tokens); ⌘K; bloque de análisis (Overview); historial de runs; settings de fuentes; deploy en Vercel.

**Pendiente:**
- Renderizar el bloque de análisis en Comparativa/Live feed/Galería (seed ya en DB).
- **Cablear el runner para generar el análisis por sección** con Claude+Grok (código a sumar; gasta tokens solo en run real).
- **Export PDF/PPT** real (hoy `/reporte` es preview).
- **Mobile / responsive** (las grillas son de ancho fijo; falta layout responsivo + bottom-tabs).
- **Imágenes reales** (hero/empty states/thumbnails) con Gemini.
- **Auth / multi-tenancy** y modelo de billing (decisiones abiertas, HANDOFF §10).
- Conectar Comparativa/Galería a datos reales de DB (hoy usan datos del caso).

**Caveats:** los mappers de Apify son best-effort (ajustar por actor); runs largos corren síncronos en serverless (evaluar cola/Edge Function); costos de Apify/Grok aún no se leen del uso real.

---

## 10. Cómo correr local

```bash
cp .env.example .env.local   # ya apunta al proyecto Supabase
npm install
npm run dev                  # http://localhost:3000
npm run build                # validación
```
