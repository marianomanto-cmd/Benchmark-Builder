# Benchmark Builder

AI-assisted competitive research & social listening. Single operator, allowlisted auth.

> Diseño: `Design files/HANDOFF.md` es el contrato visual. No improvisar contra él.

## Infraestructura

Todo vive en tres servicios — nada self-hosted ni local-only:

- **GitHub** — repo + CI (branch `claude/review-folder-contents-LO48S`).
- **Vercel** — hosting del Next.js app + Cron jobs (purga 30d, insights periódicos).
- **Supabase** — Auth (Google + email/password) · Postgres · Realtime · Storage.

Sin BullMQ/Redis: en serverless los runs se disparan desde route handlers de
Vercel y el estado vive en una tabla `runs`. El scraping gratis (Reddit, Bluesky,
Mastodon, RSS) corre inline (son segundos); Apify es async vía webhook (Fase 3).

## Stack

- Next.js 15 (App Router, TS estricto, typed routes)
- React 19
- Tailwind v4 (config en CSS vía `@theme`)
- Supabase Auth (`@supabase/ssr`) — Google OAuth + email/password, allowlist a un solo email
- next-intl — i18n estructurado desde día 1 (sólo `es-AR` por ahora)
- motion 11 (ex framer-motion) — animaciones del §6 del handoff
- Recharts — charts

## Setup

Las env vars se cargan en **Vercel** (Project → Settings → Environment Variables).
Para correr `pnpm dev` apuntando a Supabase, copiá `.env.example` a `.env.local`.

```bash
pnpm install
cp .env.example .env.local   # completar con los valores de Supabase
pnpm dev
```

### Setup de Supabase Auth (una vez, en el dashboard)

1. **Authentication → Providers → Google**: pegar Client ID/Secret de Google
   Cloud Console. Redirect URL: `https://<proyecto>.supabase.co/auth/v1/callback`.
2. **Authentication → URL Configuration**: Site URL = `https://<app>.vercel.app`;
   agregar `https://<app>.vercel.app/auth/callback` a Redirect URLs.
3. **Authentication → Users → Add user**: crear `mantovanimariano@transfil.com.ar`
   con password `soymarianito`, marcando *Auto Confirm User*.

El allowlist (`AUTH_ALLOWED_EMAIL`) se valida en el middleware y en `/auth/callback`:
cualquier otra sesión queda bloqueada.

## Scripts

```bash
pnpm dev         # next dev
pnpm build       # next build
pnpm typecheck   # tsc --noEmit
pnpm lint        # next lint
pnpm format      # prettier --write
```

## Estructura

```
src/
├── app/
│   ├── (app)/         # rutas autenticadas (ScreenShell + pantallas)
│   ├── auth/          # callback (OAuth code exchange) + signout
│   ├── login/         # /login con Suspense + form client (Supabase)
│   ├── layout.tsx
│   ├── providers.tsx  # ToastProvider
│   └── page.tsx       # redirect → /overview
├── components/
│   ├── ui/            # primitivos (Btn, Field, KPI, Modal, Toast…)
│   ├── domain/        # MentionCard, CompetitorCard, CostMeter…
│   ├── charts/        # BBBarChart (Recharts)
│   └── shells/        # ScreenShell (sidebar + topbar)
├── i18n/              # next-intl config + mensajes es-AR
├── lib/
│   ├── supabase/      # client (browser) + server + allowlist helper
│   ├── fixtures/      # data demo Copa Airlines (Fase 1)
│   ├── cn.ts          # clsx + tailwind-merge
│   ├── fonts.ts       # Geist · JetBrains Mono · Newsreader
│   ├── format.ts      # números rioplatenses (es-AR estricto)
│   └── motion.ts      # easings, durations, variants del §6
├── styles/
│   ├── tokens.css     # design tokens (port del paquete de diseño)
│   └── globals.css    # @theme + clases t-* + keyframes
middleware.ts          # refresca sesión Supabase + gate de allowlist
Design files/          # mocks del paquete de diseño + HANDOFF.md
```

## Roadmap

| Fase | Scope | Infra que se enchufa |
|---|---|---|
| 1 | Esqueleto navegable, paridad visual con los mocks, fixtures hardcoded | Vercel (deploy) + Supabase Auth |
| 2 | Backend + fuentes gratis (Reddit, Mastodon, Bluesky, Web, RSS, YouTube) + Grok | Supabase Postgres (Drizzle) + Realtime + Storage · Vercel Cron |
| 3 | Apify (Instagram, TikTok, X, Facebook, Meta Ad Library) | Apify webhooks → route handler de Vercel |
| 4 | Multi-tenant + RLS, billing, modo oscuro, i18n traducido, polish prod | Supabase RLS + Stripe |
