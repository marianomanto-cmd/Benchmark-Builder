# Benchmark Builder

Herramienta de research competitivo y social listening asistida por IA. Un operador
define un cliente, sus competidores y las plataformas a monitorear; la IA scrapea,
analiza sentimiento, detecta insights y arma material curado para un reporte editorial
exportable.

> **Caso de demo:** Copa Airlines vs Avianca / LATAM / Wingo / Arajet · ruta Cartagena.

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Lenguaje | TypeScript estricto |
| Estilos | Tailwind CSS v4 + design tokens (`app/globals.css`) |
| Fuentes | Geist · JetBrains Mono · Newsreader (`next/font`) |
| Backend | Supabase (Postgres + Auth + Realtime + Storage) |
| Deploy | Vercel (env vars inyectadas por la integración Supabase↔Vercel) |

## Estructura

```
app/                  Rutas (una por pantalla) + layout + tokens globales
  page.tsx            01 · Overview            /
  live-feed/          02 · Live feed           /live-feed
  comparativa/        03 · Comparativa         /comparativa
  galeria/            04 · Galería org/ad      /galeria
  research-plan/      05 · Plan de research    /research-plan
  editor/             06 · Editor de reporte   /editor
  reporte/            07 · Reporte PDF         /reporte
components/
  ui/                 Primitivos (Btn, KPI, Field, Toast…) + íconos + charts
  domain.tsx          Componentes de dominio (MentionCard, CompetitorCard…)
  shell/              ScreenShell (sidebar + topbar)
  screens/            Las 7 pantallas
lib/
  platforms.ts        Registro de plataformas + tipos
  format.ts           Formateo de numerales es-AR (2.418 · 41,3 % · USD 1,84)
  supabase/           Clientes browser / server / proxy
proxy.ts              Refresco de sesión Supabase (Next 16 `proxy` convention)
design/               Contrato visual: HANDOFF.md, tokens.css, mocks HTML/JSX
```

El **contrato visual** vive en [`design/HANDOFF.md`](design/HANDOFF.md). Los componentes
portan 1:1 los mocks de `design/_shared/*.jsx`.

## Setup local

```bash
cp .env.example .env.local   # ya apunta al proyecto Supabase "Benchmark Builder"
npm install
npm run dev                  # http://localhost:3000
```

### Variables de entorno

Ver [`.env.example`](.env.example). Las de Supabase (`NEXT_PUBLIC_*`) se inyectan solas
en Vercel. Para correr benchmarks reales hacen falta además: `SUPABASE_SERVICE_ROLE_KEY`
(escritura del runner), `XAI_API_KEY` (Grok), `APIFY_TOKEN` y `META_AD_LIBRARY_TOKEN`.

## Pipeline de ingesta

`POST /api/runs { slug?, platforms? }` dispara un run (`lib/runner.ts`): scrapea las
fuentes, puntúa sentimiento con Grok, hace upsert de menciones, recalcula agregados de
competidores, regenera insights y registra costo. Adaptadores en `lib/sources/`:

| Fuente | Proveedor |
|---|---|
| Reddit · Mastodon · Bluesky | API pública (sin token) |
| Instagram · TikTok · X · YouTube · Facebook · Web | Apify (`APIFY_TOKEN`) |
| Meta Ad Library | API oficial (`META_AD_LIBRARY_TOKEN`) |
| Sentimiento + insights | xAI Grok (`XAI_API_KEY`) |

Sin credenciales, cada fuente se marca `skipped` y la UI sigue mostrando el caso demo.

## Estado

7 pantallas con el design system completo. Schema + seed en Supabase. Overview y Live
feed leen datos reales (con fallback a demo). Pipeline de ingesta completo y cableado al
botón "Aprobar y ejecutar" — listo para enchufar tokens. Decisiones abiertas en
`design/HANDOFF.md` §10 (billing, modelo de auth).
