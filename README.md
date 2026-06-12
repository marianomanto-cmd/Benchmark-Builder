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

| Var | Descripción |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase (pública) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable/anon key (pública, va al browser) |

En Vercel se inyectan solas vía la integración Supabase↔Vercel.

## Estado

Las 7 pantallas están implementadas con el design system completo y datos del caso de
demo (mock). Próximo: schema de DB en Supabase, runner de scraping/IA y datos en vivo.
Decisiones abiertas en `design/HANDOFF.md` §10 (schema, billing, modelo de auth).
