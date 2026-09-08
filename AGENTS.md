<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Smile Lab · Presupuestos

App interna del consultorio: cargar presupuestos odontológicos, calcular
lo que queda a cargo del paciente según su obra social, y seguir la
respuesta comercial hasta que el tratamiento se inicia o se pierde.

Stack: Next.js 16 (App Router) + Supabase (Postgres, Auth, Storage) + Vercel.

## Next.js 16 — lo que cambia respecto de lo que sabés

- Turbopack es el default. Los scripts NO llevan `--turbopack`.
- `params`, `searchParams`, `cookies()`, `headers()` y `draftMode()` son
  **asíncronos**. `const { id } = await params`.
- `middleware.ts` ya no existe: es `proxy.ts` con función `proxy`.
  Runtime nodejs, no configurable.
- `revalidateTag(tag, profile)` lleva dos argumentos. Para
  read-your-writes en Server Actions usá `updateTag(tag)`; para
  refrescar el router, `refresh()`.
- Tipos de rutas: `PageProps<'/ruta/[id]'>`, `LayoutProps<'/ruta'>`,
  `RouteContext<'/api/x/[id]'>` son globales, no se importan.
- Tailwind v4: los tokens viven en `@theme` dentro de `app/globals.css`.
  **No hay `tailwind.config.ts`** y no hay que crearlo.

## LA REGLA QUE GOBIERNA TODO EL PRODUCTO

**El presupuesto emitido es un documento, no una consulta a la base.**

Al guardar se **copian** dentro de `presupuesto_items` el nombre de la
prestación, su descripción, el monto, el tipo y valor de cobertura y la
diferencia calculada. Nunca se resuelven precios por join.

1. `aranceles` es **append-only**. Un cambio de precio inserta una fila
   nueva y cierra la anterior. Nunca un `UPDATE` de monto o cobertura.
2. Un arancel ya usado en un presupuesto **no se puede editar**
   (bloqueado en la UI y por trigger).
3. Si el arancel vigente hoy difiere del snapshot, el detalle muestra un
   banner informativo. La única acción ofrecida es **duplicar**. No
   existe "actualizar precios de este presupuesto".
4. Los overrides de cobertura viven en el ítem (`cobertura_override_*`),
   nunca escriben en `aranceles`.

Si algo de esto se relaja, el consultorio pierde la capacidad de
defender un presupuesto viejo frente a un paciente. Es el requisito no
funcional más importante del sistema.

## Fuentes de verdad

| Qué | Dónde |
|---|---|
| Cálculo de cobertura y a-cargo | `lib/calculo.ts` **y** `calcular_cobertura()` en SQL — tienen que dar el mismo número |
| Formato de moneda y fechas es-AR | `lib/formato.ts` |
| Máquina de estados y colores de badge | `lib/estados.ts` |
| Tokens de diseño | `@theme` en `app/globals.css` |
| Esquema | `supabase/migrations/` |
| Estado del proyecto | `docs/STATUS.md` |

## Convenciones de código

- Español rioplatense en todo el texto user-facing, en los nombres de
  dominio (`presupuesto`, `arancel`, `aCargo`) y en los comentarios.
  El código de infraestructura puede ir en inglés.
- Montos: enteros en pesos en el cliente, `numeric(12,2)` en la base.
  Se formatean con `money()` de `lib/formato.ts` → `$ 128.400`.
- Todo monto lleva `font-variant-numeric: tabular-nums` (clase `tnum`).
- Server Components por defecto. `'use client'` sólo donde hay estado,
  eventos o hooks.
- Las escrituras con lógica de dominio (crear presupuesto, nueva
  vigencia, cambiar estado) van por RPC de Postgres, no por inserts
  sueltos: tienen que ser atómicas.
- Nunca un ícono solo en una acción destructiva: siempre con texto.
- Área táctil mínima 44px en mobile; FAB 56px.
- Mobile nunca usa tabla: card por presupuesto.

# Documentation discipline (MANDATORY)

Keep the documentation in sync with the code at all times. Whenever you
make a change, update the docs **in the same change/commit**, before
pushing:

- `docs/STATUS.md` is the single source of truth for project state —
  update its data model, pipeline, screens, env vars, and "Hecho vs
  pendiente" sections whenever they change, and bump the "Última
  actualización" date.
- When you add/alter DB schema, write the migration file under
  `supabase/migrations/` AND reflect it in `docs/STATUS.md` §4.
- When you add env vars, update `.env.example` AND `docs/STATUS.md` §8.
- A task is not "done" until its docs are updated. No undocumented changes.
