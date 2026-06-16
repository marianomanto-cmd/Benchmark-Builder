# AI Benchmark Builder · Handoff de diseño para desarrollo

**Para:** equipo de implementación (Claude Code / dev humano)
**De:** diseño · v 0.1 · 2026.05
**Producto:** AI Benchmark Builder — herramienta de research competitivo y social listening asistida por IA.
**Caso de demo en los mockups:** Copa Airlines vs Avianca / LATAM / Wingo / Arajet · ruta Cartagena.

> Este documento es **contrato visual**. Si algo no está acá, preguntá antes de improvisar. Si lo construís diferente a lo que dice, hay que aprobarlo con diseño primero. No es un sugerencia.

---

## TL;DR — 12 reglas que no se negocian

1. **Paleta sangría sobre neutros stone cálidos.** Nunca grises fríos. El fondo es crema (`#FAF8F4`), no blanco puro.
2. **Sangría (`#6B1A36`) es marca + AD ribbons + acentos del reporte.** Dentro de un workspace, el primario funcional pasa a ser el color del cliente; sangría queda reservada para chrome global y reporte.
3. **Tres familias tipográficas y nada más.** Geist (UI), JetBrains Mono (números), Newsreader (reporte exportado y pull-quotes editoriales). Inter / Roboto / Arial están prohibidas.
4. **Mono en cualquier número que aparezca en columna o se compare.** `font-variant-numeric: tabular-nums`. Sin excepciones.
5. **Pesos tipográficos: 400 / 500 / 600. Nunca 700+.**
6. **Una sola acción `primary` por pantalla.** El acento (sangría) se usa para CTAs de marca puntuales: *Generar reporte*, *Aprobar y ejecutar*. No para todo.
7. **El estado `loading` es contenido, no decoración.** Scrapeos y análisis IA tardan 5s a 4min. Skeleton para <2s, spinner + descripción para >2s. Costo estimado **siempre visible** antes de cualquier run.
8. **AD ribbon sangría sobre `MediaThumb` y `MentionCard` cuando es Meta Ad Library.** Orgánico nunca lleva ribbon. La separación org/ad es lo más importante del producto.
9. **Densidad Linear-balanced.** Filas 40-44 px, botones 28/34/40, inputs 36, sidebar 240. En mobile, mínimo 44 px de hit target.
10. **Numerales en español rioplatense.** `2.418` (miles con punto), `41,3 %` (decimal con coma, espacio antes del %), `USD 1,84` (currency prefijado con espacio).
11. **Acento sangría desaparece dentro de un workspace operativo.** En el mock todo es Copa porque es el único workspace mostrado; en producción el primario se reemplaza por `workspace.brandColor`.
12. **`text-wrap: balance`** en titulares, **`pretty`** en párrafos. Siempre.

---

## 0 · Estructura del proyecto entregado

```
Design files/
├── index.html                  ← hub navegable
├── HANDOFF.md                  ← este documento
├── _shared/
│   ├── tokens.css              ← TODAS las variables CSS
│   ├── bb-primitives.jsx       ← Btn, KPI, BBBadge, Field, Toast, BBBarChart, BBTable…
│   ├── bb-domain.jsx           ← PlatformBadge, MentionCard, CompetitorCard, InsightCard, AlertCard, CostMeter, MediaThumb…
│   ├── screens-desktop.jsx     ← ScreenShell + 7 pantallas desktop
│   ├── screens-mobile.jsx      ← MobileShell + 7 pantallas mobile
│   └── ios-frame.jsx           ← Bezel iPhone (sólo presentación, no llevar a producción)
├── desktop/  ← 7 HTMLs · 1440 × 900 (07 en US Letter 816 × 1056)
└── mobile/   ← 7 HTMLs · 402 × 874 dentro de bezel iPhone
```

Cada archivo HTML es **standalone**: abre con un doble clic y funciona. No hay build step en la entrega de diseño. Eso es así para que cualquiera pueda inspeccionar el resultado sin instalar nada — **vos** sí vas a tener build step (Next.js o lo que elijas).

---

## 1 · El producto en una página

**Qué es:** herramienta para un operador (Sebastián, agencia de research) que produce reportes de inteligencia competitiva para sus clientes. Cada proyecto define un cliente, sus competidores y las plataformas a monitorear. La IA scrapea, analiza sentimiento, detecta patrones e insights, y devuelve material curado. El operador edita, arma el reporte final y lo exporta.

**Tres modos cognitivos del producto:**
- **Operativo/denso** (Live feed, Comparativa, Galería): pantallas para revisar mucha data rápido. Tipo Linear / Stripe Dashboard.
- **Reflexivo/editorial** (Reporte exportado): el deliverable final, formato tipo FT / Bloomberg. Newsreader, jerarquía clara, prosa.
- **Decisional** (ResearchPlanReview, Editor): donde el operador toma decisiones. Layout balanceado, jerarquía visible, costo a la vista.

**Por qué la paleta sangría:** porque el producto vende inteligencia, no dashboards. Los neutros stone + sangría dan gravitas editorial. Los azules SaaS hacen que el output parezca otra herramienta más.

---

## 2 · Sistema de diseño

### 2.1 Color

Espejá la tabla completa en `tailwind.config.ts` o `theme.ts`. Está toda en `_shared/tokens.css`.

#### Neutros — stone, warm

| Token | Hex | Uso típico |
|---|---|---|
| `--paper` | `#FAF8F4` | Fondo de app, fondo de página de reporte |
| `--n50` | `#F4F1EB` | Zebra rows, hover de tabla, fondos sutiles |
| `--n100` | `#ECE7DD` | Fondo del canvas del editor, dividers en oscuro |
| `--n200` | `#DDD6C7` | **Borde sutil default** (cards, dividers) |
| `--n300` | `#C7BDAB` | Borde definido (inputs, botones secondary) |
| `--n400` | `#A89E8B` | Iconos disabled, texto en oscuro |
| `--n500` | `#847A68` | Texto secundario (muted) |
| `--n600` | `#635A4B` | Texto cuerpo en jerarquía secundaria |
| `--n700` | `#3D352A` | Texto cuerpo, badges neutros |
| `--n800` | `#2A241C` | Sidebar dark, raised surfaces |
| `--n900` | `#181410` | **Ink** — texto principal, primary buttons, sidebar |

**Regla:** los neutros forman una escala perceptual. Si necesitás un valor intermedio (raro) usá `oklch()` para interpolar — nunca inventes un hex random.

#### Acento sangría

| Token | Hex | Uso |
|---|---|---|
| `--sa-soft` | `#F6E6EC` | Fondo de bloques destacados (galería de ads, hallazgo en reporte, fila del cliente en comparativa) |
| `--sa-light` | `#C3517A` | Hovers sobre acento, sparkline del cliente |
| `--sa-base` | `#6B1A36` | **Color de marca**. CTA accent, tab activa, ribbon AD, sidebar border-left, hallazgo |
| `--sa-strong` | `#4A0F24` | Texto sobre `--sa-soft`, hover de `--sa-base` |
| `--sa-violet` | `#8A2A5F` | Reservado para variantes / alternativas sutiles |

#### Estados semánticos

- `--success` `#1F7A3A` + `--success-soft` `#E3F1E7` — badges "activo", trend up, sentimientos positivos.
- `--warn` `#9A4A14` + `--warn-soft` `#F5E8D8` — badges "revisión", anomalías, alertas medias.
- `--danger` `#B8261D` + `--danger-soft` `#FBE5E3` — errores, destructive, alerta alta.
- `--info` `#1D3FB8` + `--info-soft` `#E1E6F7` — borradores, neutral informativo.

#### Plataformas (sólo para `<PlatformBadge>` y data-viz por plataforma)

```
instagram   #C13584
tiktok      #111111
youtube     #C4302B
facebook    #1877F2
x           #0F0F0F
reddit      #FF4500
mastodon    #6364FF
bluesky     #1083FE
web         #6B6B6B
meta_ads    #4267B2
```

**Donde NO se usan:** comparaciones entre marcas en gráficos. Esos gráficos usan la escala monocromática `--n900 → --n300` y `--sa-base` para la serie del cliente.

#### Orgánico vs Ad

```
--organic   var(--n700)
--ad        var(--sa-base)
```

Esta dualidad es **el patrón visual más importante del producto**. La galería los separa visualmente; las MentionCards pagas llevan ribbon; las CompetitorCards muestran ambos volúmenes separados. Nunca los mezclés en una sola visualización sin distinguirlos.

### 2.2 Tipografía

Tres familias, una sola misión cada una.

#### Familias

- **Geist** (400, 500, 600) — UI completa, body, headings de app. Google Fonts. Activá feature settings `cv11, ss01` para que se vea bien.
- **JetBrains Mono** (400, 500, 600) — números en columna, IDs (run #042), hex values, timestamps, costos, hashes. **Siempre** con `font-variant-numeric: tabular-nums`.
- **Newsreader** (400, 500, opsz 6..72) — **sólo** en el reporte exportado (`07-report-pdf`) y en pull-quotes de hallazgo dentro de la app. Si la usás en otro lado, la app empieza a confundirse con el deliverable y se rompe el contrato.

#### Escala (clases ya provistas en `tokens.css`)

| Clase | Size / line | Weight | Letter-spacing | Uso |
|---|---|---|---|---|
| `.t-display` | 36 / 40 | 600 | `-0.02em` | Hero de pantalla principal |
| `.t-h1` | 24 / 28 | 600 | `-0.02em` | Headers de sección |
| `.t-h2` | 18 / 24 | 600 | `-0.01em` | Headers de bloque |
| `.t-h3` | 15 / 20 | 600 | `0` | Headers de card |
| `.t-body` | 14 / 20 | 400 | `0` | Body por defecto |
| `.t-small` | 13 / 18 | 400 | `0` | Captions, secundario |
| `.t-micro` | 11 / 14 | 500 | `+0.08em` UPPERCASE | Labels, eyebrows |
| `.t-mono` | hereda | hereda | `0` | Modificador: cambia a JetBrains + tabular |
| `.t-serif` | hereda | hereda | hereda | Modificador: cambia a Newsreader |

#### Reglas inviolables

1. **Pesos:** 400 (body) / 500 (énfasis) / 600 (títulos). Nunca 700+.
2. **Letter-spacing:** `-0.02em` en h1/h2/display; `+0.08em` en micro uppercase.
3. **`text-wrap: balance`** en todos los h1/h2/display. **`text-wrap: pretty`** en párrafos. Siempre.
4. **Mono** en: cualquier número en columna, IDs, hex, costos, timestamps, KPIs, deltas, métricas en card footers.
5. **Italics** = sólo en Newsreader como tono editorial (citas, énfasis en pull-quotes). En Geist, no usar italic salvo `<em>` semántico mínimo.
6. **Tamaños mínimos:** 11 px en micro/mono, 12 px en captions, 13 px en body secundario, 14 px en body principal. Nunca por debajo de 11.

#### Numerales

- Miles: punto (`2.418`).
- Decimal: coma (`41,3`).
- Porcentajes: espacio antes del `%` → `41,3 %`.
- Currency: prefijo + espacio → `USD 1,84`. **No usar el símbolo `$` solo** (ambigüedad con peso colombiano, argentino, dólar).
- Rangos: en-dash con espacios → `USD 8 – 12k`.

### 2.3 Spacing — escala 4pt

```
--sp-1   4px
--sp-2   8px
--sp-3   12px
--sp-4   16px
--sp-5   20px
--sp-6   24px
--sp-8   32px
--sp-10  40px
--sp-12  48px
--sp-16  64px
```

**Patrones:**
- Padding interno de cards: 16-18 px.
- Gap entre cards en grid: 14-16 px.
- Padding de pantalla (contenido vs chrome): 24 px desktop, 14 px mobile.
- Padding interno de botones: 10/14/18 px horizontal (sm/md/lg).
- Gap entre icono y texto en botón: 6 px.

### 2.4 Radius

```
--r-xs   2px    bars in charts, ribbons
--r-sm   4px    buttons, inputs, badges (NO pills)
--r-md   6px    cards, panels, modals — el más usado
--r-lg   10px   superficies grandes, ocasionales
--r-xl   16px   sólo si hace falta (no usado en v1)
```

**Lo dominante es 4-6 px.** Nada de 12+ px excepto en superficies grandes ocasionales. Pills (badges con `border-radius: 99px`) son la excepción explícita.

### 2.5 Shadows

```
--sh-1   subtle 1px shadow              cards default, pills
--sh-2   raised cards on canvas
--sh-3   floating panels, dropdowns
--sh-4   modals, focus overlays
```

**Por defecto las cards NO llevan sombra** — sólo borde `--n200` + fondo `#fff`. Las sombras aparecen en hover, en superficies elevadas (el canvas papel del editor) y en modales/overlays.

### 2.6 Densidad

| Elemento | Desktop | Mobile |
|---|---|---|
| Botón sm / md / lg | 28 / 34 / 40 | 36 / 44 / 48 |
| Input height | 36 | 44 |
| Tabla header / row | 40 / 44 | n/a (no tablas en mobile) |
| Sidebar expanded / collapsed | 240 / 64 | n/a (bottom tabs) |
| Topbar | 56 | 52 |
| Tab bar (mobile) | n/a | 64 + 14 safe area |
| Status bar (mobile) | n/a | 50 (dynamic island clearance) |
| Card padding | 16-18 | 12-14 |
| Hit target mínimo | 28 | **44** (regla iOS/Android) |

---

## 3 · Componentes — inventario y API

Re-implementá estos en tu librería con las firmas exactas. Los mocks usan estas APIs; respetalas para que la transición código-mock-código sea trivial.

### 3.1 Primitivos (`_shared/bb-primitives.jsx`)

#### `<Btn>`

```ts
type BtnProps = {
  kind?: 'primary' | 'secondary' | 'accent' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  iconRight?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children?: ReactNode;
}
```

**Comportamiento:**
- `primary` = fondo `--n900`, texto blanco. **Una sola por pantalla.**
- `secondary` = fondo blanco, borde `--n300`, texto `--n900`.
- `accent` = fondo `--sa-base`, texto blanco. Sólo para CTAs de marca (Generar reporte, Aprobar y ejecutar).
- `ghost` = sin fondo, sin borde, hover sutil.
- `destructive` = fondo blanco, borde y texto `--danger`. En hover, fondo `--danger-soft`.

**Estados que tenés que implementar:**
- **Hover:** sutil oscurecimiento (ink → 90% de luminancia, otros igual). Transición `background 120ms ease-out`.
- **Focus visible:** ring de 3 px `rgba(24,20,16,.08)` (light) o `rgba(255,255,255,.12)` (dark). **Visible siempre con teclado.**
- **Active/pressed:** `transform: translateY(1px)` + sombra reducida. Transición 80ms.
- **Loading:** ícono cambia a spinner (rotación CSS, 0.9s linear infinite). El texto del botón se mantiene (no lo cambies a "Cargando…" salvo que el texto original sea muy corto).
- **Disabled:** `opacity: 0.45`, `cursor: not-allowed`, sin hover.

**Animación del icono:** si el botón tiene `iconRight` y se hace hover, el icono se desplaza 2 px a la derecha (`transition: transform 150ms ease`). Pequeño detalle pero sumá vida.

#### `<BBBadge>`

```ts
type BadgeProps = {
  tone?: 'success' | 'warn' | 'danger' | 'info' | 'accent' | 'neutral';
  size?: 'sm' | 'md';
  dot?: string;       // override del dot izquierdo (colores de plataforma)
  children: ReactNode;
}
```

Outline + dot interno. El dot toma el color del tone por defecto; se puede sobreescribir (ej: badge "Instagram" usa dot `#C13584` con tone `neutral`).

#### `<KPI>`

```ts
type KPIProps = {
  label: string;
  value: string;       // ya formateado en mono
  delta?: string;      // "+12,4%"
  up?: boolean;        // dirección de delta
  spark?: boolean;     // dibuja sparkline a la derecha
  bar?: number;        // 0-100, reemplaza spark con barra de progreso
  tone?: 'ink';        // versión inversa (fondo --n900). MAX 1 por pantalla.
  empty?: boolean;
  skeleton?: boolean;
}
```

**Composición visual:**
- Label en `t-micro` (color `--n500`).
- Value en mono 30 px / weight 500 / letter-spacing -0.01em.
- Delta en 12 px con icono de trend (success/danger) + Mono.
- Sparkline o barra en la parte inferior.

**Animaciones:**
- Al mount, el value puede animar desde 0 hasta el target con `requestAnimationFrame` o `framer-motion useSpring` (1.2s, ease-out). Nice-to-have, no bloquea v1.
- La sparkline se dibuja con `stroke-dashoffset` animado de 100% a 0 (1s ease-out) al mount.

#### `<Field>` (input / select / search / textarea)

```ts
type FieldProps = {
  label: string;
  value?: string;
  ph?: string;
  select?: boolean;     // muestra chevron derecho
  search?: boolean;     // ícono lupa izquierdo
  focused?: boolean;    // visual override (para mocks)
  error?: string;       // muestra mensaje debajo
  mono?: boolean;
  textarea?: boolean;
  onChange?: (v: string) => void;
}
```

**Estados:**
- **Default:** borde `--n300`, fondo blanco.
- **Hover:** borde `--n400`.
- **Focused:** borde `--n900`, ring `rgba(24,20,16,.08)` 3 px afuera.
- **Error:** borde `--danger`, ring `rgba(184,38,29,.10)`, mensaje en Mono debajo.
- **Disabled:** fondo `--n50`, borde `--n200`, texto `--n400`.

**Transición:** `box-shadow 150ms ease, border-color 150ms ease`.

#### `<Toast>`

```ts
type ToastProps = {
  kind: 'success' | 'danger' | 'warn' | 'info';
  title: string;
  body: string;
  action?: { label: string; onClick: () => void };
  onDismiss?: () => void;
}
```

**Composición:** border-left de 3 px en el color del estado, ícono a la izquierda, título + body, action inline subrayado a la derecha, close en `--n400`.

**Animaciones:**
- **Entrada:** `transform: translateY(20px) → 0`, `opacity 0 → 1`, 240ms ease-out.
- **Salida:** `opacity 1 → 0`, `transform: translateY(-10px)`, 180ms ease-in.
- **Auto-dismiss:** 5s para success/info, **no auto-dismiss** para danger/warn (el usuario tiene que reconocer el error).
- **Stack:** los toasts se apilan abajo-derecha, con gap de 8 px.

#### `<BBBarChart>`

Stacked bars 12 meses, 5 series (Avianca, LATAM, Wingo, Arajet, Copa). Y-axis a la izquierda con 5 ticks, X-axis con iniciales de mes.

**En producción:** usar Recharts con tema custom.

```ts
const chartColors = {
  avianca: 'var(--n900)',
  latam:   'var(--n700)',
  wingo:   'var(--n500)',
  arajet:  'var(--n300)',
  copa:    'var(--sa-base)',   // SIEMPRE el cliente en sangría
};
```

**Reglas:**
- Tooltip al hover de cualquier barra: muestra los 5 valores apilados con su color.
- La serie del cliente **siempre arriba del stack** (más visible).
- Gridlines `1px dashed --n200`.
- Etiquetas de mes en Mono 10 px `--n500`.

**Animaciones:**
- **Entrada:** las barras crecen desde abajo, stagger por mes (50ms cada uno), `transform-origin: bottom`, 600ms ease-out.
- **Hover sobre barra:** opacidad 100% en la columna, 60% en las demás.
- **Switch de período (7d/30d/60d/YTD):** crossfade 200ms + crecimiento.

#### `<Skel>` skeleton

`<Skel w h>` — div con `linear-gradient` animado. Animación:

```css
@keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }
.skel { animation: shimmer 1.4s ease-in-out infinite; }
```

Gradient `--n100 → --n200 → --n100`, 200% width.

#### Patrones de estado en `<BBStates>`

- **Empty:** ícono outline 36 px en círculo dashed, título 14 px, descripción 12 px `--n500`, CTA secundario para resolver. Centrado.
- **Error:** fondo `--danger-soft`, ícono error en círculo blanco, título danger, descripción `--n700`, CTA destructive con texto "Reintentar" o similar.
- **Modal destructiva:** **type-to-confirm**. El campo se desbloquea cuando el usuario tipea exactamente "eliminar" (lowercase, sin acentos). Botón destructive deshabilitado hasta entonces.
  - **Animación:** modal entra con `transform: scale(0.96) → 1` + `opacity 0 → 1`, 200ms ease-out, sobre backdrop `rgba(24,20,16,.6)` con `backdrop-filter: blur(8px)`.
  - **Backdrop click** cierra; **Esc** cierra.
  - **Focus trap** mientras está abierta.

### 3.2 Componentes de dominio (`_shared/bb-domain.jsx`)

#### `<PlatformBadge>`

```ts
type PlatformBadgeProps = {
  platform: 'instagram' | 'tiktok' | 'youtube' | 'facebook' | 'x' | 'reddit' | 'mastodon' | 'bluesky' | 'web' | 'meta_ads';
  size?: 'sm' | 'md' | 'lg';   // 14 / 18 / 24
  label?: boolean;             // mostrar el nombre además del glyph
}
```

**Glyphs:** son originales (no logos literales) para evitar problemas de IP. Están en `_shared/bb-domain.jsx` como objeto `PG`. En producción podés reemplazarlos por logos reales si tu licencia lo permite — pero **mantené el cuadrado redondeado de fondo del color de la plataforma**.

#### `<SentimentChip>`

```ts
type SentimentProps = {
  kind: 'pos' | 'neu' | 'neg' | 'mix';
  big?: boolean;
  label?: string;  // override; '' lo oculta
}
```

Dot + texto. El sentimiento del backend viene como score `0–1`:
- `[0.0, 0.35)` → neg
- `[0.35, 0.65)` → neu o mix (mix si la dispersión es alta)
- `[0.65, 1.0]` → pos

#### `<MentionCard>`

```ts
type MentionCardProps = {
  platform: PlatformKey;
  author: string;
  handle: string;
  ts: string;                       // "hace 4 h" — formateá server-side o con dayjs
  brand: string;                    // "Avianca"
  body: string;                     // line-clamp a 2 (con thumb) o 4 (sin thumb)
  metrics: [string, string][];      // [['♡', '12,4k'], ['💬', '284']]
  sentiment: 'pos' | 'neu' | 'neg' | 'mix';
  thumbType?: 'photo' | 'video' | 'article' | 'ad';
  isAd?: boolean;                   // ribbon sangría
  permalink?: string;               // link externo a la publicación original
}
```

**Composición:**
1. Header: PlatformBadge md + author/handle + brand chip + (si `isAd`) ribbon top-right.
2. Thumb opcional: 140 px alto, full width. Para video, overlay play centrado.
3. Body: 13/19, line-clamp 2 o 4.
4. Footer: métricas en mono + SentimentChip a la derecha.

**Animaciones:**
- **Hover:** sombra de none → `--sh-2`, transición 150ms. Cursor pointer si tiene permalink.
- **Thumb hover:** overlay sutil `rgba(0,0,0,.05)` aparece (sólo si es media interactiva).
- **AD ribbon:** entrada al mount con `transform: translateX(-4px) → 0` + opacity, 200ms.

**Permalink:** click en la card abre `permalink` en pestaña nueva. Hover muestra ícono ext en el corner. **Nunca** muestres el permalink crudo en la UI — es ruido.

#### `<CompetitorCard>` (con `<Sparkline>` embebido)

```ts
type CompetitorCardProps = {
  name: string;
  handle: string;
  brand: string;            // letra inicial
  accent: string;           // color CSS — neutro para no-cliente, sangría para cliente
  platforms: PlatformKey[];
  mentions: string;
  sov: string;
  sent: SentimentKind;
  sparkData: number[];      // últimos 14 puntos
  onClick?: () => void;
}
```

Click navega al detalle del competidor (vista no incluida en v1 mocks; usar `Comparativa` o un drill-down separado).

**Sparkline animation:** dibujado con `stroke-dasharray` desde 0 hasta longitud total, 800ms ease-out al mount o cuando los datos cambian.

#### `<InsightCard>` / `<AlertCard>` / `<CostMeter>`

**InsightCard:**

```ts
type InsightCardProps = {
  kind: 'opp' | 'thr' | 'pat' | 'ano';
  title: string;
  body: string;
  sources: number;          // cantidad de menciones que soportan el insight
  confidence: string;       // "0,87" formateado
  evidenceUrl?: string;     // link a vista con las menciones que lo soportan
}
```

- `opp` = oportunidad, success
- `thr` = amenaza, danger
- `pat` = patrón, info
- `ano` = anomalía, warn

Border-left 3 px en color del kind. Badge outline arriba con icono + nombre. Confidence en mono a la derecha.

**Animación:** entrada con stagger cuando se carga la lista (`transform: translateY(8px) → 0` + opacity, 80ms entre cada card, 240ms duración).

**AlertCard:**

```ts
type AlertCardProps = {
  severity: 'high' | 'med' | 'low';
  title: string;
  body: string;
  when: string;
  evidence?: string;        // hint en mono sobre la fuente
  onMarkRead?: () => void;
  onDismiss?: () => void;
  onOpen?: () => void;
}
```

Dot del color de severity. Acciones inline en el footer.

**CostMeter:**

```ts
type CostMeterProps = {
  used: number;             // USD gastado en el run
  soft: number;             // umbral de warning
  hard: number;             // cap
  period: string;           // "run #042" o "mes 05"
  live?: boolean;           // si está activo, anima el contador
}
```

Composición:
- Header: período + estado (OK/WARN/OVER) en mono.
- Valor en mono 22 px + cap en mono pequeño.
- Barra de progreso con marca vertical en `soft`.
- Color de barra: success si `used < soft`, warn si `used >= soft`, danger si `used >= hard`.

**Animaciones:**
- Si `live`, el valor cuenta en tiempo real (poll cada 2s al backend, animá la transición con `useSpring`).
- La barra cambia de color con transición `background 300ms ease`.
- Cuando cruza `soft`, la barra **pulsea una vez** (`scale 1 → 1.03 → 1`, 600ms) para llamar la atención.

#### `<MediaThumb>`

```ts
type MediaThumbProps = {
  kind: 'photo' | 'video' | 'article' | 'ad';
  platform: PlatformKey;
  isAd?: boolean;
  src?: string;             // imagen real en producción
  label?: string;
  metrics?: string[];       // overlay inferior
  ratio?: '4/5' | '1/1' | '9/16';
}
```

**En producción:** reemplazá `ThumbPlaceholder` por `<Image>` (Next/Image o `<img>` con `loading="lazy"`). Mantené overlays, ribbon y aspect-ratio.

**Animaciones:**
- **Hover:** scale del contenido interno a 1.04 (`overflow: hidden` en el contenedor), 300ms ease. El ribbon NO se mueve.
- **Click:** abre lightbox/modal con la versión completa.

#### `<RankingBlock>`

Tres layouts en una sola lógica de datos:

```ts
type RankingBlockProps = {
  layout: 'grid' | 'list' | 'comparison_table';
  title: string;
  subtitle?: string;
  metric: 'engagement' | 'reach' | 'mentions';
  data: RankingItem[];
}
```

- `grid` — 3 columnas con thumb grande. Para top 3 con visual fuerte.
- `list` — 5 filas densas. Para top 5-10.
- `comparison_table` — matriz competidor × métrica. Para overview comparativo.

El usuario elige el layout al insertar el bloque en el reporte.

### 3.3 Layout chrome

#### `<ScreenShell>` (desktop)

Sidebar 64 px (compacta) + topbar 56 px + content scrollable.

**Sidebar:**
- Fondo `--n900`, accent border-left 2 px en sangría.
- Workspace selector arriba: avatar + nombre + count de proyectos. Click abre menú con todos los workspaces.
- Nav primario: Dashboard, Proyectos, Catálogo de competidores, Templates, Insights globales, Alertas.
- Proyectos recientes: listado expandible.
- Settings + user al fondo.
- **Hover de item:** background `--n800`, transición 100ms.
- **Active item:** border-left 2 px sangría, background `--n800`, texto blanco.

**Topbar:**
- Breadcrumb a la izquierda con badges contextuales.
- Search input centrado-derecho con shortcut `⌘K`.
- Botones de acción a la derecha (Presentación, Nuevo run).

**Comportamiento de la sidebar:**
- En desktop ≥ 1280 px, expandida (240 px).
- En 768-1279 px, colapsada (64 px) por default; hover expande a 240 con animación 200ms.
- En < 768 px, oculta; bottom tabs.

#### `<MobileShell>` (mobile)

App bar 52 + content + bottom tabs 64 (+ 14 px safe area).

- **Status bar clearance:** 50 px arriba para el iPhone dynamic island. **Crítico** — sin esto, el contenido queda tapado.
- **App bar:** back arrow (si aplica) + título + subtítulo en mono + kebab.
- **Bottom tabs:** Resumen / Feed / Compar. / Reportes / Más. La tab activa: color sangría + border-top 2 px sangría + texto bold.
- **Tap animation en tab:** scale 0.92 al press, vuelta a 1, 100ms.

---

## 4 · Las 7 pantallas — anatomía detallada

### 4.1 Overview (`01-overview`)

**Propósito:** la pantalla que se abre por defecto al entrar a un proyecto. Resume todo en una vista.

**Composición desktop (top → bottom):**
1. **Tabs de proyecto:** Overview / Setup / Runs · 4 / Live feed / Competidores / Reportes · 2. Tab activa en sangría con underline 2 px. Hover: color `--n900`.
2. **Hero header:** eyebrow micro sangría · h1 con balance · descripción · 2 botones a la derecha (PDF, Generar reporte).
3. **KPI row:** 4 tiles iguales — Menciones, Engagement, SOV (este en `tone='ink'`), Inversión paga.
4. **Body grid:** chart (2/3) + insights compact + cost meter (1/3).
5. **Competitor strip:** 5 CompetitorCards en grid.

**Composición mobile:**
- Header app bar.
- Hero condensado.
- KPIs 2×2.
- Chart en card.
- Insights compact en card.
- Competidores: lista 1-col, no grid.

**Animaciones:**
- Stagger de entrada de KPIs (60ms cada uno).
- Chart con animación de barras.
- Insight cards: stagger 80ms.
- Cost meter: bar fill animado desde 0.

### 4.2 Live feed (`02-live-feed`)

**Propósito:** stream de menciones recientes con filtros. La pantalla operativa por excelencia.

**Composición desktop:**
- Sidebar de filtros (240 px): FilterGroups por Competidor / Plataforma / Sentimiento / Tipo. Cada item con checkbox sangría, count en mono.
- Header del feed: título · badge "vivo" · sort dropdown · CSV export.
- Active filter chips (scrollable horizontal, removibles con `×`).
- Grid 3-col de MentionCards.

**Composición mobile:**
- Search input arriba.
- Filter chips horizontal scrollable.
- Sort dropdown inline.
- Lista 1-col de MentionCards.

**Animaciones:**
- Click en filter checkbox: feedback inmediato (no esperes al fetch). Sangría aparece con `scale 0 → 1`, 120ms.
- Card aparece nueva en el feed (live update): slide-in desde arriba, 300ms ease-out, con un highlight sangría que se desvanece en 800ms.
- Sort change: lista re-ordena con FLIP animation (lib: `framer-motion` `<AnimatePresence>` + `layout`).
- Filter chip remove: chip se desvanece + lista re-render con FLIP.

**Estado en vivo:**
- Badge "vivo" con dot success que pulsea (`opacity 1 → 0.4 → 1`, 1.6s infinite).
- Polling cada 30s o WebSocket — tu decisión.

### 4.3 Comparativa (`03-comparativa`)

**Propósito:** matriz competidor × métrica.

**Composición desktop:**
- Header con eyebrow + h1 + acciones (CSV, Insertar en reporte).
- Tabla densa: filas = métricas, columnas = competidores. La columna del cliente (Copa) tiene fondo `--sa-soft` y texto sangría.
- Cada celda formateada según tipo: mono numérico, SentimentChip, barra de progreso, lista de PlatformBadges.

**Composición mobile:**
- Segmented selector arriba (Tabla / Métricas / Visual).
- En "Métricas" (default): **una card por métrica**, dentro 5 filas (una por competidor) con barra horizontal proporcional + valor mono. La fila del cliente en sangría.
- Card extra al final para Sentimiento dominante (dot grid).
- CTA "Insertar en reporte" abajo.

**Por qué cambia el formato:** una matriz horizontal con 5 columnas no entra en 393 px. La metáfora "una métrica = una card" es más legible y se adapta a touch.

**Animaciones:**
- Bars: width 0 → target, 600ms ease-out, stagger 80ms entre filas.
- Hover de celda desktop: highlight de fila + columna (líneas sutiles en `--sa-base`).

### 4.4 Galería · orgánico vs ad (`04-galeria`)

**Propósito:** ver TODO el material visual de los competidores, **separado por origen** (orgánico vs pago).

**Composición desktop:**
- Header.
- Dos columnas iguales: izquierda = orgánico (fondo `#fff`, dot organic), derecha = ads (fondo `--sa-soft`, borde sangría, dot ad).
- Cada columna agrupada por competidor. Dentro de cada grupo, grid 3-col de MediaThumbs.

**Composición mobile:**
- Segmented tabs "Orgánico · 218" / "Pagos · 84" en lugar de columnas.
- Sort dropdown inline.
- Grid 2-col de MediaThumbs agrupados por competidor.

**Animaciones:**
- Cambio de tab mobile: crossfade 200ms.
- Thumb hover desktop: scale interno 1.04.
- Click thumb: lightbox modal (carrusel con ← → kbd nav).
- Filter change: FLIP animation (los thumbs se re-ordenan suavemente).

### 4.5 ResearchPlanReview (`05-research-plan`)

**Propósito:** la IA propone un plan de scrapeo, el usuario aprueba o edita antes de quemar tokens. **Pantalla crítica del producto** — sin esto, los costos se descontrolan.

**Composición desktop:**
- Header con eyebrow "STEP 2 / 4 · PLAN PROPUESTO" + h1 "Antes de gastar tokens, mostrámelo." + descripción.
- Columna izquierda (2/3): card "FUENTES PROPUESTAS · 7 PLATAFORMAS" con lista de plataformas. Cada fila: checkbox sangría, PlatformBadge, nombre, target accounts, volumen estimado, costo. Botón "Editar" por fila. Footer con TOTAL ESTIMADO en mono grande.
- Columna derecha (1/3): card "RAZONAMIENTO · IA" con prosa explicando por qué se eligieron esas plataformas; card "PARÁMETROS" con período, idioma, geo, etc.; botones "Editar plan", "Cancelar", **"Aprobar y ejecutar"** (accent sangría).

**Composición mobile:**
- Eyebrow + h1 + descripción.
- Lista de plataformas (1-col, checkbox + badge + nombre + costo).
- Card de parámetros.
- Card de razonamiento.
- **Sticky bottom bar** con costo total + Aprobar (esto es lo crítico: el costo nunca se pierde de vista).

**Animaciones:**
- Toggle de plataforma (uncheck): la card se atenúa (opacity 0.5), el costo total decrementa con counter animation.
- "Aprobar y ejecutar" → modal de confirmación con costo final + tiempo estimado. Una vez confirmado, transición a la pantalla de Live feed con un toast "Run #043 iniciado · 4 min 12s estimado".

**Razonamiento IA:**
- Renderizá la prosa real del LLM, no plantillas.
- Soportá streaming (`stream: true` en la API call) si querés mostrar el razonamiento aparecer token por token. UX delicioso.

### 4.6 Editor de reporte (`06-editor`)

**Propósito:** componer el deliverable. El operador edita los bloques pre-armados por la IA.

**Composición desktop (3 columnas):**
- Izquierda (220 px): **Outline** con lista de páginas. Cada item: número de página en mono + título. Drag handle al hover. Click navega a la página. La página activa tiene border-left sangría + fondo `--n50`. Botón "Agregar sección" al final.
- Centro (flex): **Canvas** con fondo `--n100` (canvas color) y la página actual como una hoja blanca con sombra. Padding interno tipo papel (56/64 px). Header de página en micro mono `--n400`. Bloques editables inline.
- Derecha (280 px): **Properties** del bloque seleccionado. Tipo de bloque, fuente de datos, propiedades específicas (tipo de chart, período, highlight), paleta de bloques nuevos para insertar.

**Composición mobile:**
- Notice arriba: "Editor disponible en desktop · acá podés previsualizar y exportar".
- Lista de páginas (índice).
- Preview thumb de la página actual (scale down).
- Botones Preview / PDF abajo.

**Bloques editables:**
- Texto (Newsreader o Geist).
- H2 sección.
- Cita / Hallazgo (con border-left sangría, eyebrow micro mono).
- Gráfico (chart embed con dashed border sangría cuando seleccionado).
- Tabla.
- KPI grid.
- Galería.
- Ranking (con sub-layout grid/list/comparison).

**Comportamiento de selección:**
- Click en bloque: dashed border `--sa-base` 2 px aparece. Label flotante arriba: "BLOQUE · GRÁFICO · seleccionado". Toolbar flotante arriba-derecha con acciones (Reemplazar fuente / Duplicar / Eliminar). Panel derecho actualiza.
- Click fuera: deselect.

**Animaciones:**
- Selección: dashed border anima desde 0 a 2 px de grosor en 150ms.
- Drag de bloque (reorder dentro de página): clon flota con sombra, los otros bloques se mueven con FLIP.
- Insertar bloque: aparece con slide-down + opacity, 240ms.
- Autosave indicator: "autoguardado hace 4s" con dot success pulseante.

**Editor library sugerida:** TipTap (Pro) o Plate.js. NO inventes editor desde cero.

### 4.7 Reporte exportado · PDF (`07-report-pdf`)

**Propósito:** el deliverable final. Esto es lo que el cliente recibe.

**Composición:**
- US Letter portrait (816 × 1056 px @ 72 dpi en el mock).
- Header: marca arriba-izquierda en mono micro, número de página arriba-derecha, barra sangría 3 px vertical al inicio de cada sección.
- Eyebrow "SECCIÓN 04 · VOLUMEN Y SOV" en mono sangría.
- H1 en Newsreader 54 px con `text-wrap: balance` y `em` en italic para énfasis.
- Subhead en mono `--n500` (período · fuentes · totales).
- Body en Newsreader 14/22, dos columnas.
- Figure: borde top + bottom `--n200`, eyebrow "FIG. 4.1", sub-header en Newsreader 18, chart, leyenda en sans.
- Pull quote: border-left sangría 3 px, eyebrow "HALLAZGO · 4.1" en mono sangría, texto en Newsreader 22 con italic.
- Mini table: 3 columnas, top border negro, separadores tenues.
- Footer: créditos en mono micro `--n400` ("preparado para Copa Airlines · uso interno" | "generado con AI Benchmark Builder").

**Composición mobile:**
- No es un editor — es un viewer.
- Page pill arriba ("página 04 / 14" + botón Índice).
- Sheet de página escalada al ancho mobile.
- Botones ← Anterior / Siguiente → abajo.
- Botones Descargar PDF / Compartir.

**Generación del PDF real:**
- Recomendado: `@react-pdf/renderer` — declarativo, fuentes embebidas, mismo modelo mental que React. Soporta Newsreader.
- Alternativa: Playwright/Puppeteer renderizando `07-report-pdf.html` con CSS print + headers/footers.
- **Crítico:** el PDF debe ser **vectorial** (no rasterizado). Newsreader y todos los textos como text-runs reales. Charts como SVG embebido.

**Cover/portada (no diseñada en este pase):** página 1 con título grande tipo libro, eyebrow del cliente, fecha, autor, índice. Imitar el lenguaje de la página 04 — Newsreader, sangría sutil, mucho aire.

---

## 5 · Estados, vacíos, errores

Todos los componentes deben tener variantes para los siguientes estados. Esto se diseña ANTES de implementar las happy paths, no después.

### Loading
- **<2s:** skeleton.
- **2-30s:** spinner inline + descripción "Analizando 240 menciones · est. 12s".
- **>30s:** progress bar + descripción + estimado de tiempo restante. Permitir cancelar.
- **>60s:** lock the UI con un overlay y un mensaje claro: "Estamos procesando · te avisamos cuando termine. Podés cerrar esta pestaña."
- **Background jobs (scrapeo, IA):** notificación toast al completar. Badge con count en el item Alertas del sidebar.

### Empty
- **Sin proyectos:** centered, ícono dashed, "Sin proyectos todavía", CTA "Crear proyecto".
- **Sin runs:** "Sin runs todavía", CTA "Configurar proyecto" o "Ejecutar primer run".
- **Sin menciones tras filtros:** "Ninguna mención coincide con tus filtros", CTA "Limpiar filtros".
- **Sin reportes:** "Sin reportes todavía", CTA "Crear reporte desde plantilla".

### Error
- **Token expirado / API down:** card danger con explicación específica + CTA "Reintentar" o "Ir a Settings".
- **Run fallido:** alert card con severity high + link a logs.
- **Validación de form:** mensaje inline debajo del field en Mono `--danger`.
- **Network offline:** banner sticky abajo (no toast) con "Sin conexión · reintentando en 5s". Reintento exponencial.

### Edge cases del producto
- **0 competidores definidos:** el botón "Nuevo run" está disabled con tooltip "Agregá al menos 1 competidor".
- **0 plataformas seleccionadas:** idem.
- **Cap mensual excedido:** banner sangría sticky arriba: "Excediste tu cap de USD 500/mes · subí el cap o esperá al próximo ciclo." CTA a billing.
- **Workspace sin branding:** los reportes usan sangría como fallback.

---

## 6 · Animaciones — guía exhaustiva

Animar bien es lo que separa una app que se siente buena de una que se siente cara. Acá están todas las micro-interacciones que tenés que implementar. Si una no está en esta lista pero te parece obvia, animala — pero respetá los timings y curvas de abajo.

### 6.1 Curvas (`easing`)

Usá estas 4. Ninguna otra.

```js
const ease = {
  out:    'cubic-bezier(0.2, 0.7, 0.3, 1)',   // entradas, expand
  in:     'cubic-bezier(0.7, 0, 0.84, 0)',    // salidas, collapse
  inOut:  'cubic-bezier(0.4, 0, 0.2, 1)',     // movimiento balanceado
  bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)' // sutil bounce (sparingly)
};
```

### 6.2 Timings

| Acción | Duración | Curva |
|---|---|---|
| Hover state | 120-150ms | out |
| Focus ring | 120ms | out |
| Press / active | 80ms | inOut |
| Modal/sheet entrada | 240ms | out |
| Modal/sheet salida | 180ms | in |
| Toast entrada | 240ms | out |
| Toast salida | 180ms | in |
| Page transition | 240ms | inOut |
| Skeleton shimmer | 1400ms loop | inOut |
| Pulse (live indicator) | 1600ms loop | inOut |
| Number counter | 800-1200ms | out |
| Chart bars entry | 600ms | out |
| Stagger entre items | 50-80ms | — |
| FLIP layout reflow | 240ms | out |

### 6.3 Lista de micro-interacciones por componente

| Componente | Interacción | Detalle |
|---|---|---|
| `<Btn>` | Hover | `background` darken 8%, 150ms out |
| | Press | `translateY(1px)`, 80ms inOut |
| | Focus | Ring 3px ease-in, 120ms |
| | Loading | Icon swap to spinner (rotate infinite) |
| | Icon right | Hover `translateX(2px)` 150ms |
| `<Btn accent>` | Idle | sutil background-shimmer (opcional, 4s infinite muy tenue) |
| `<BBBadge>` | Mount | scale 0.92 → 1, 180ms out + opacity |
| `<KPI>` | Mount | value counter 0 → target, 1000ms out |
| | Spark line | dash-offset 100% → 0, 800ms out |
| | Bar | width 0 → target, 600ms out |
| | Delta arrow | translateY arrow ±2px loop muy sutil (opcional) |
| `<Field>` | Focus | border + ring fade in, 150ms out |
| | Error | shake horizontal 6px ±, 200ms (al primer error) |
| `<Toast>` | Entrance | translateY(20) → 0 + opacity, 240ms out |
| | Exit | translateY(-10) + fade, 180ms in |
| | Action click | flash sangría, 200ms |
| `<MentionCard>` | Hover | shadow none → sh-2, 150ms |
| | Mount in feed (live) | slideDown 300ms + highlight sangría fade 800ms |
| | AD ribbon | translateX(-4) → 0 + fade, 200ms out |
| `<MediaThumb>` | Hover | inner scale 1.04, 300ms out |
| | Click lightbox | scale 0.8 → 1 + opacity, 240ms out |
| `<CompetitorCard>` | Hover | borde `--n300 → --n400`, sombra `sh-2`, 150ms |
| | Sparkline | dash-offset, 800ms out |
| `<InsightCard>` | List mount | stagger 80ms, translateY(8) → 0 + fade, 240ms out |
| `<CostMeter>` | Live update | bar width spring + value counter |
| | Cruzar `soft` | bar pulse `scale 1.03` once, 600ms |
| `<BBBarChart>` | Mount | bars grow from bottom, stagger 50ms by month, 600ms out |
| | Hover bar | other bars opacity 0.6, 200ms |
| | Period switch | crossfade + grow, 320ms |
| Tabs | Active change | underline slides smoothly between tabs (FLIP), 240ms out |
| Sidebar | Item active | border-left grow 0 → 2px, 150ms |
| | Workspace switch | full content fade out → in, 200ms each |
| Modal | Backdrop | opacity 0 → 0.6 + blur 0 → 8px, 200ms out |
| | Content | scale 0.96 → 1 + opacity, 200ms out |
| | Esc/close | scale 1 → 0.96 + fade, 180ms in |
| Filter chip | Add | scale 0 → 1 + fade, 180ms out + bounce ligero |
| | Remove | scale → 0.8 + fade, 140ms in |
| Live dot | Pulse | opacity 1 → 0.4 → 1, 1600ms infinite |
| Live mention | Highlight | bg sangría-soft → transparent, 800ms |
| Filter checkbox | Check | fill grow scale 0 → 1, 120ms out |
| Skeleton | Shimmer | gradient slide 200% → -200%, 1400ms loop |
| Page transition | Route change | content fade out → in, 200ms each side |
| Tooltip | Mount | scale 0.92 → 1 + fade, 120ms out |
| | Delay before show | 400ms (excepto si viene de otro tooltip cercano: 0ms) |

### 6.4 Reglas globales

- **`prefers-reduced-motion`:** respetarlo. Cuando el usuario lo pide, deshabilitá TODAS las animaciones excepto opacity fades sutiles (<150ms).
- **No animar `width`/`height` directamente** — usá `transform: scale` o `clip-path`. Las animaciones de layout deterioran rendimiento.
- **Stagger es tu amigo** en listas de >3 items. Sin stagger se ve sincronizado y robótico.
- **Hover transitions cortas (<150ms), exit transitions más cortas que entry.** Las salidas no merecen tanta atención como las entradas.
- **Nunca animes el blur del backdrop sin animar también la opacity** — ese tipo de animación rota es cara y se nota.

### 6.5 Librería sugerida

**Framer Motion** (`framer-motion@11+`). Cubre todo lo de arriba con APIs declarativas:
- `<motion.div animate>` para entrada/salida.
- `<AnimatePresence>` para listas con add/remove.
- `layout` prop para FLIP automático.
- `useSpring` / `useMotionValue` para counters y métricas live.
- Respeta `prefers-reduced-motion` out-of-the-box con `useReducedMotion()`.

Alternativa sin lib: CSS transitions + Web Animations API. Más laburo, mismo resultado.

---

## 7 · Stack sugerido

| Capa | Sugerencia | Por qué |
|---|---|---|
| Framework | Next.js 15 App Router | SSR para reporte público, server actions para runs |
| Tipos | TypeScript estricto | Schemas de mention / competitor / insight son centrales |
| Estilos | Tailwind CSS + `tokens.css` como capa base | Velocidad sin perder el sistema |
| UI primitivos | shadcn/ui (cherry-pick) | Dialog, Tabs, Tooltip, Command, Sheet, Popover |
| Animaciones | Framer Motion 11+ | Todo lo de §6 |
| Charts | Recharts | Bars, lines, sparklines en SVG |
| Tabla densa | TanStack Table | Para tabla de competidores y de menciones |
| Editor de reporte | TipTap Pro o Plate.js | Bloques custom, drag-and-drop, output JSON |
| PDF export | `@react-pdf/renderer` | Vectorial, fuentes embebidas, Newsreader funciona |
| Forms | React Hook Form + Zod | Setup de proyecto, edición de plan |
| Server state | tRPC + TanStack Query | Live feed con polling/SSE |
| Auth | NextAuth / Clerk | Workspaces + roles |
| DB | Postgres + Drizzle ORM | Schemas claros |
| Cola de jobs | BullMQ (Redis) | Scrapeos largos (min); no bloqueá HTTP |
| AI | OpenAI / Anthropic SDK | Streaming para razonamiento, structured output para plan |
| Realtime | Pusher / Ably / Postgres LISTEN | Live feed updates |

---

## 8 · Prioridades de implementación

**Sprint 1 — Foundation (1 semana):**
1. Setup Next + Tailwind + `tokens.css` + fonts (Geist, JetBrains Mono, Newsreader).
2. Primitivos: Btn, Field, BBBadge, KPI, Skel, Toast, Modal.
3. Animaciones base con Framer Motion (hover, focus, mount).
4. Layout: ScreenShell desktop, MobileShell, responsive routing.

**Sprint 2 — Vistas de consumo (2 semanas):**
5. Overview · 01.
6. Live feed · 02 con filtros funcionales.
7. Comparativa · 03 (cambio de formato mobile crítico).
8. Galería · 04.

**Sprint 3 — Vistas de creación (2 semanas):**
9. ResearchPlanReview · 05 conectado al runner backend.
10. Editor · 06 (arrancá con bloques fijos; drag-and-drop = sprint 4).
11. Export PDF · 07 con `@react-pdf/renderer` + Newsreader embebido.

**Sprint 4 — Pulido y modo oscuro:**
12. Mobile views completas.
13. Estados error/empty/loading exhaustivos.
14. `prefers-reduced-motion`.
15. Modo oscuro (los tokens están definidos en el canvas).
16. Performance pass (lazy loading, code splitting, Suspense boundaries).

---

## 9 · Gotchas críticos

- **No usar Inter, Roboto, Arial, ni system-ui.** Geist. Self-hosteala si tu CDN no la sirve (es MIT).
- **No usar emoji propios.** Los que aparecen en los mocks son del autor del contenido (un tweet, un post), nunca de la UI.
- **No usar gradientes** salvo en `<ThumbPlaceholder>` (que se reemplaza por imagen real). Las superficies son planas con borde + sombra.
- **Newsreader sólo en reporte y pull-quotes de hallazgo.** Si la usás en otro lado, se rompe el contrato.
- **El acento sangría desaparece dentro de un workspace.** El primario funcional pasa a ser `workspace.brandColor`. Sangría queda sólo en chrome global, AD ribbons, marca BB y reporte exportado.
- **`<MediaThumb>` placeholders deben reemplazarse por `<Image>` reales antes de producción.** Mantené aspect-ratio, overlays y ribbon.
- **El editor en mobile NO edita.** Sólo previsualiza. Esto es intencional y debe respetarse: la complejidad de un editor de bloques en 393 px no justifica el esfuerzo. Surface "abrí en desktop" como en el mock.
- **Costo siempre visible antes de un run.** Cualquier acción que dispare scraping/IA debe pasar por `ResearchPlanReview` con estimado. El `<CostMeter>` se actualiza en vivo durante la ejecución.
- **El stack es sugerencia, no decreto.** Lo importante es: TypeScript estricto, tokens respetados, animaciones consistentes con §6, accesibilidad AA mínimo.
- **Si Geist no se está cargando** y ves system-ui en el output, abortá y arreglá los font imports. Es el bug visual más común y arruina todo.

---

## 10 · Lo que NO está definido (te toca a vos)

- Schema exacto de la DB.
- Política de retención de menciones (¿borramos a los 6 meses?).
- Modelo de billing (por proyecto / por workspace / flat). Los `<CostMeter>` muestran USD/run pero el plan comercial no está cerrado.
- Auth: ¿single user (Sebastián como operador) o multi-tenant con sus clientes adentro?
- Integraciones reales con plataformas (¿Apify? ¿Bright Data? ¿propio?). Los mocks asumen que la capa de scraping es una caja negra que devuelve `Mention[]`.
- Compliance: Meta Ad Library tiene términos de uso; X cerró su API; TikTok scraping es zona gris. Validar antes de prometer plataformas.
- Sistema de templates de reporte (estructura, herencia, marketplace interno).
- Multi-idioma (los mocks están en español, pero el sistema debe soportar `i18n` desde el día 1).

Levantá ticket cuando vayas a empezar cualquiera de estos.

---

## 11 · Cómo se trabaja con diseño

- **Cambios visuales** (color, type, spacing): pedido por escrito antes de mergear. **Los tokens son contrato.**
- **Componentes nuevos:** si necesitás algo que no existe acá, propuesta primero (sketch o referencia visual), aprobación, después implementación. No improvises.
- **Edge cases visuales** (qué pasa con 0 menciones, 0 competidores, 0 plataformas activas): tenés los estados `empty` y `error` en `bb-primitives.jsx`. Replicá ese lenguaje, no inventes otro.
- **Si encontrás un bug en los mocks:** avisame con captura. Lo arreglo en el contrato visual; vos lo arreglás en el código.

---

## 12 · Checklist de "está terminado"

Antes de hacer merge, cada PR debe pasar:

- [ ] Geist, JetBrains Mono y Newsreader (sólo donde corresponde) cargan correctamente.
- [ ] Tokens CSS importados; no hay colores hardcodeados con hex en componentes.
- [ ] Pesos tipográficos son 400/500/600 únicamente.
- [ ] Numerales en mono donde aplica, format `es-AR` (decimal coma, miles punto).
- [ ] Hit targets ≥44 px en mobile.
- [ ] Focus visible con teclado en todos los elementos interactivos.
- [ ] `prefers-reduced-motion` deshabilita animaciones.
- [ ] Estados loading / empty / error implementados para la pantalla afectada.
- [ ] Contraste AA mínimo verificado.
- [ ] Animaciones siguen los timings y curvas de §6.
- [ ] La pantalla se ve idéntica al mock correspondiente en `Design files/desktop/` y `Design files/mobile/`.
- [ ] Mobile y desktop ambos funcionan; no se rompe en breakpoints intermedios.
- [x] **No hay tablas de datos en mobile**: comparativa, tabla §03 del reporte y roadmap FODA muestran **tarjetas apiladas** en mobile (`components/comparison-cards.tsx`, `bb-hide-sm`/`bb-only-sm`); el reporte impreso y desktop conservan la tabla (`.bb-rep-table`/`.bb-rep-cards` con `@media screen`/`print`). La galería ya usaba columnas de cards.

---

**Última actualización:** 2026.05 · v 0.1
**Owner del documento:** diseño de AI Benchmark Builder
**Owner del código:** vos.

Si tenés dudas, leé este documento de nuevo. Si la duda persiste, preguntá. Si decidís hacer algo distinto a lo que dice, **avisá antes de mergear**. Esto no es burocracia, es para que el producto se vea como debe verse.
