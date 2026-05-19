# Benchmark Builder

AI-assisted competitive research & social listening. Single operator, allowlisted auth.

> Diseño: `Design files/HANDOFF.md` es el contrato visual. No improvisar contra él.

## Stack

- Next.js 15 (App Router, TS estricto, typed routes)
- React 19
- Tailwind v4 (config en CSS vía `@theme`)
- next-auth v5 — Google OAuth + Credentials, allowlist a un solo email
- next-intl — i18n estructurado desde día 1 (sólo `es-AR` por ahora)
- motion 11 (ex framer-motion) — animaciones del §6 del handoff
- Recharts — charts (Fase 1 en adelante)

## Setup local

```bash
pnpm install
cp .env.example .env.local
# editar .env.local — instrucciones inline en .env.example
pnpm dev
```

### Generar el hash de la password

```bash
node -e "console.log(require('bcryptjs').hashSync('soymarianito', 10))"
# pegar el output en AUTH_DUMMY_PASSWORD_HASH
```

### Generar AUTH_SECRET

```bash
openssl rand -base64 32
```

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
│   ├── (app)/         # rutas autenticadas
│   ├── api/auth/      # NextAuth handlers
│   ├── login/         # /login con Suspense + form client
│   ├── layout.tsx
│   └── page.tsx       # redirect → /overview
├── i18n/              # next-intl config + mensajes es-AR
├── lib/
│   ├── auth.ts        # NextAuth v5 — allowlist + Google + Credentials
│   ├── cn.ts          # clsx + tailwind-merge
│   ├── fonts.ts       # Geist · JetBrains Mono · Newsreader
│   ├── format.ts      # números rioplatenses (es-AR estricto)
│   └── motion.ts      # easings, durations, variants del §6
├── styles/
│   ├── tokens.css     # design tokens (port del paquete de diseño)
│   └── globals.css    # @theme + clases t-* + keyframes
└── types/             # ambient types
middleware.ts          # gate: redirige a /login si no hay sesión
Design files/          # mocks del paquete de diseño + HANDOFF.md
```

## Roadmap (resumen)

| Fase | Scope |
|---|---|
| 1 | Esqueleto navegable, paridad visual con los mocks, fixtures hardcoded |
| 2 | Backend + fuentes gratis (Reddit, Mastodon, Bluesky, Web, RSS, YouTube) + Grok |
| 3 | Apify (Instagram, TikTok, X, Facebook, Meta Ad Library) |
| 4 | Multi-tenant, billing, modo oscuro, i18n traducido, polish prod |
