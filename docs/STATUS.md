# Estado del proyecto — Smile Lab · Presupuestos

> **Última actualización:** 2026-09-08
> Este documento es la fuente de verdad del estado del proyecto. Si cambia el
> esquema, el pipeline, una pantalla o una variable de entorno, se actualiza
> acá **en el mismo commit**.

---

## 1 · Qué es

Aplicación interna del consultorio para cargar presupuestos odontológicos,
calcular lo que queda a cargo del paciente según su obra social, y seguir la
respuesta comercial hasta que el tratamiento se inicia o se pierde.

Un solo consultorio, un solo equipo, todos ven todo. No hay multi-tenancy.

---

## 2 · La regla que gobierna todo

**El presupuesto emitido es un documento, no una consulta a la base.**

Al guardar se copian dentro de `presupuesto_items` nombre, descripción, monto,
tipo y valor de cobertura y la diferencia calculada. Nunca se resuelven precios
por join contra `aranceles`.

Consecuencias que el código respeta hoy:

| # | Regla | Dónde está garantizada |
|---|---|---|
| 1 | `aranceles` es append-only | RPC `nueva_vigencia`, sin policy de DELETE, trigger `trg_arancel_no_delete` |
| 2 | Un arancel usado no se edita | Trigger `trg_arancel_inmutable` + sello "no editable" en la UI |
| 3 | Precio desactualizado → banner informativo, sólo duplicar | Pantalla 11 + RPC `duplicar_presupuesto` |
| 4 | Los overrides viven en el ítem | Columnas `cobertura_original_*` y `motivo_override` en `presupuesto_items` |
| 5 | Un presupuesto emitido no vuelve a borrador | Guarda en `cambiar_estado` |
| 6 | El historial no se borra ni se edita | Trigger `trg_evento_inmutable`, policies sólo SELECT/INSERT |

---

## 3 · Arquitectura

- **Next.js 16**, App Router, Turbopack por defecto.
  `params`/`searchParams`/`cookies()` son asíncronos. `middleware.ts` es
  `proxy.ts`. Tailwind v4 con los tokens en `@theme` dentro de
  `app/globals.css` — **no hay `tailwind.config.ts`**.
- **Server Components** para la carga inicial de cada pantalla.
- **TanStack Query + cliente de navegador** para lecturas interactivas
  (comboboxes, grilla de aranceles, kanban).
- **Server Actions** para las escrituras; las que tienen lógica de dominio
  delegan en **RPC de Postgres** para ser atómicas.
- **RLS**: autenticado = acceso, anónimo = nada. La autorización es de la base,
  no del código. `proxy.ts` sólo hace el chequeo optimista y refresca la sesión.

### Librerías

| Necesidad | Elección |
|---|---|
| Componentes base | Radix (patrón shadcn/ui, primitivos propios en `components/ui/`) |
| Sheet mobile | Vaul |
| Combobox | cmdk |
| Formularios | react-hook-form + zod |
| Datos | @supabase/ssr + TanStack Query |
| Kanban | dnd-kit |
| PDF | @react-pdf/renderer |
| Fechas | date-fns (locale `es`) |
| Toasts | sonner |
| Íconos | lucide-react (stroke 1.75) |

---

## 4 · Modelo de datos

Migraciones en `supabase/migrations/`, en este orden:

| Archivo | Contenido |
|---|---|
| `20260101000000_schema.sql` | Tipos, tablas, índices, `updated_at` |
| `20260101000100_guardas.sql` | Numeración y las guardas de la regla del snapshot |
| `20260101000200_rpc_vistas.sql` | Cálculo, RPC y vistas |
| `20260101000300_rls.sql` | Row Level Security y `grant execute` de las RPC |
| `20260101000400_storage.sql` | Bucket privado `presupuestos` y sus policies |

### Tablas

| Tabla | Rol |
|---|---|
| `profesionales` | Equipo. `user_id` null = profesional sin login |
| `obras_sociales` | Nombre + plan. Único por `(nombre, plan)` |
| `pacientes` | Ficha. `obra_social_id` precarga el paso 1 del wizard |
| `prestaciones` | Catálogo. `descripcion` es la plantilla que se copia |
| `prestacion_cuotas` | Plantilla de condiciones de pago (suma 100 %) |
| `aranceles` | **Append-only** con vigencias. `obra_social_id` null = particular |
| `presupuestos` | Cabecera + snapshot de contexto + totales congelados |
| `presupuesto_items` | **El documento**: snapshot completo de cada prestación |
| `presupuesto_cuotas` | Condiciones de pago congeladas |
| `presupuesto_eventos` | Historial append-only que alimenta el timeline |

### Tipos

- `tipo_cobertura`: `porcentaje` · `monto` · `ninguna`
- `estado_presupuesto`: `borrador` · `realizado` · `enviado` · `pendiente` ·
  `interesado` · `aceptado` · `iniciado` · `perdido`
- `motivo_perdida`: `precio` · `sin_respuesta` · `cobertura` · `otro_lugar` · `otro`

### Índices que importan

- `aranceles_una_vigente` — único parcial: **una sola vigencia abierta** por
  `(prestación, obra social)`, con `coalesce` para cubrir el null de particular.
- `pacientes_nombre_fts` / `prestaciones_nombre_fts` — GIN sobre
  `to_tsvector('spanish', nombre)` para los comboboxes.
- `presupuestos (estado, fecha_emision desc)` — listado y pipeline.

### Funciones y RPC

| Nombre | Qué hace |
|---|---|
| `calcular_cobertura(monto, tipo, valor)` | Espejo SQL de `lib/calculo.ts`. **Si cambia una, cambia la otra.** |
| `actor_nombre()` | Nombre legible del usuario para los eventos |
| `nueva_vigencia(...)` | Cierra la vigencia abierta e inserta la nueva, atómico |
| `aumento_masivo(rubro, os, solo_particular, pct, desde)` | Una llamada a `nueva_vigencia` por fila, en una transacción |
| `crear_presupuesto(jsonb)` | Congela cabecera + ítems + cuotas + evento. Inserta como borrador y promueve el estado al final (lo exige `guard_item_emitido`) |
| `duplicar_presupuesto(uuid)` | Copia re-resolviendo contra los aranceles vigentes hoy |
| `cambiar_estado(id, estado, motivo, nota)` | Transición + evento. Bloquea la vuelta a borrador |
| `registrar_evento(id, tipo, desc)` | Evento suelto (nota, PDF, WhatsApp) |
| `marcar_pendientes()` | `enviado → pendiente` a los 7 días. Sólo `service_role` |

### Vistas

- `aranceles_vigentes` — grilla de la pantalla 10, con `usos` por arancel.
- `presupuestos_listado` — agrega `prestacion_principal`, `items_count` y
  `dias_en_estado` para Home y pipeline.

Ambas con `security_invoker = true`: una vista sin eso es un agujero en la RLS.

---

## 5 · Pipeline de estados

```
borrador → realizado → enviado → pendiente → interesado → aceptado → iniciado
                ↓          ↓         ↓            ↓           ↓
              perdido ←────┴─────────┴────────────┴───────────┘
```

- Cualquier estado activo puede derivar a `perdido`, con motivo opcional.
- `enviado → pendiente` es automático a los 7 días sin cambio
  (`/api/cron/pendientes`, cron diario de Vercel a las 09:00 UTC).
- `perdido` no se reabre como flujo principal: se ofrece duplicar. La transición
  inversa existe pero es secundaria en la UI.
- Cada transición inserta una fila en `presupuesto_eventos` con autor y fecha.
- Un presupuesto emitido **no vuelve a borrador**: eso reabriría sus ítems a
  edición y rompería la regla del snapshot.

---

## 6 · Pantallas

| # | Ruta | Estado |
|---|---|---|
| 01 | `/login` | Magic link, un solo campo, restricción por dominio |
| 02 | `/` | Home con datos: 4 KPIs + tabla desktop / cards mobile |
| 03 | `/` (vacía) | KPIs en `—` punteado + dos salidas |
| 04-06 | `/?nuevo=1` | Wizard 3 pasos, modal sobre la ruta actual |
| 07-08 | — | Comboboxes con creación al vuelo; prestación encadena arancel |
| 09 | `/biblioteca` | Tabs de entidades |
| 10 | `/biblioteca/aranceles` | Grilla, drawer de vigencias, aumento masivo |
| 11 | `/presupuestos/[id]` | Detalle, banner de precio, timeline |
| 12 | `/pipeline` | Kanban desktop, franja de perdidos al pie |
| 13 | `/api/presupuestos/[id]/pdf` | A4, cacheado en Storage |
| 14 | — | Sheet de WhatsApp (`?whatsapp=1` en el detalle) |

Notas de diseño cerradas:

- El wizard es un **modal sobre la ruta actual** (`?nuevo=1`), no una ruta
  propia: al cerrar, el listado de atrás no se recarga.
- El pipeline **no es un cuarto destino de navegación**: filtro de estado en
  mobile, vista alternativa en desktop.
- **Perdido va al pie del kanban**, no como columna.
- Crear una prestación **exige** cargar su arancel en el mismo flujo.
- Los overrides son internos: **no aparecen en el PDF**.
- Mobile nunca usa tabla. Área táctil mínima 44px, FAB 56px.

---

## 7 · Diseño

Tokens en `@theme` dentro de `app/globals.css`. Tipografía Sora (display) +
Manrope (UI) vía `next/font/google`.

Ocho estados con **un solo hue en escala de intensidad**, no ocho colores. Cada
badge lleva punto de 6px **y** texto: el color nunca es el único portador de
significado. La paleta literal vive en `ESTILO_ESTADO` (`lib/estados.ts`).

Todo monto lleva `font-variant-numeric: tabular-nums` y se formatea con
`money()` → `$ 128.400`.

---

## 8 · Variables de entorno

Ver `.env.example`. Resumen:

| Variable | Dónde | Para qué |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | cliente + server | Proyecto de Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | cliente + server | Clave pública; la RLS autoriza |
| `SUPABASE_SERVICE_ROLE_KEY` | **sólo server** | Route del PDF (firma URLs) y cron |
| `NEXT_PUBLIC_SITE_URL` | cliente | Redirect del magic link |
| `NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN` | cliente | Dominio del consultorio en el login |
| `CRON_SECRET` | server | Valida `/api/cron/pendientes` |
| `NEXT_PUBLIC_CONSULTORIO_*` | cliente + PDF | Encabezado y pie del documento |

En **Supabase Auth**: sólo Email / magic link, signups abiertos deshabilitados,
restricción por dominio `@smilelab.com.ar`, y `NEXT_PUBLIC_SITE_URL` + las
preview URLs de Vercel en Redirect URLs.

En **Storage**: bucket privado `presupuestos`, signed URL de 7 días.

---

## 9 · Hecho vs pendiente

### Hecho

- [x] Proyecto Next 16 con Turbopack, Tailwind v4, tokens y tipografía
- [x] Migraciones completas: esquema, guardas, RPC, vistas, RLS y Storage
- [x] Semilla de desarrollo con prestaciones, obras sociales y aranceles
- [x] `lib/calculo.ts` + espejo SQL `calcular_cobertura()`
- [x] `lib/formato.ts` (es-AR) y `lib/estados.ts` (máquina + paleta)
- [x] Primitivos de UI: Button, Pill, EstadoBadge, Field, Combobox, Sheet,
      Drawer, Tabla, Tabs, Select, Menu, Monto
- [x] Sesión con `@supabase/ssr` y `proxy.ts`
- [x] Login con magic link y callback (pantalla 01)
- [x] Shell: topbar desktop, tabbar + FAB mobile
- [x] Home con KPIs, filtros en URL, tabla desktop y cards mobile (02-03)
- [x] Wizard de 3 pasos con draft, comboboxes con creación al vuelo,
      override de cobertura y guardado con snapshot (04-08)
- [x] Biblioteca y grilla de aranceles con "Qué va a pasar" y aumento masivo (09-10)
- [x] Detalle con banner de precio desactualizado, timeline y nota interna (11)
- [x] Pipeline kanban con dnd-kit y franja de perdidos (12)
- [x] PDF A4 cacheado en Storage (13)
- [x] Sheet de WhatsApp con plantillas y `navigator.share` (14)
- [x] Cron `enviado → pendiente`

### Pendiente

- [ ] Tests automatizados (hoy no hay suite). Lo primero a cubrir:
      `calcularItem`, `repartirCuotas` y su paridad con `calcular_cobertura()`.
- [ ] Reporte de pérdidas por motivo y período (hoy sólo la franja del kanban).
- [ ] Registro de autorizaciones previas de obra social.
- [ ] Cuotas con interés o financiación en más de dos pagos.
- [ ] Recordatorio automático a los 7 días por WhatsApp (hoy sólo se promete en
      la confirmación de envío; el cambio de estado sí es automático).

---

## 10 · Por confirmar con el consultorio

- ¿Los profesionales tienen login propio, o carga siempre la recepción a nombre
  del profesional? Afecta la RLS y el default del paso 1. **Hoy se asume login
  propio con fallback**: si el usuario no tiene ficha en `profesionales`, elige
  el profesional a mano.
- ¿Las autorizaciones previas de obra social se registran en el presupuesto o
  van por fuera? **Hoy van por fuera.**
- ¿Se necesita un reporte de pérdidas por motivo y período, o alcanza la franja
  del kanban? **Hoy alcanza la franja.**
- ¿Cuotas con interés o financiación en más de dos pagos? **Hoy el modelo asume
  porcentajes sin interés.**
- ¿Multi-sucursal en el horizonte? Si sí, conviene un `sede_id` desde el inicio,
  antes de que haya datos. **Hoy no está modelado.**
