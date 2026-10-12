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

1. Un **cambio de precio** (aumento, la lista del mes) inserta una fila
   nueva en `aranceles` y cierra la anterior: `nueva_vigencia`,
   `aumento_masivo`, `importar_aranceles`. Un aumento nunca se carga como
   corrección: el precio de antes tiene que quedar en el historial.
2. **Corregir o borrar** un arancel mal cargado se puede, con cualquier
   arancel, pero sólo por `corregir_arancel` / `borrar_arancel`. Cada alta,
   corrección y baja queda en `aranceles_cambios` (append-only: antes,
   después, quién, cuándo, por qué). Si el arancel ya se usó en un
   presupuesto emitido, el motivo es obligatorio. Desde una sesión del
   equipo ninguna columna se edita ni se borra a mano (triggers).
3. Corregir o borrar un arancel **nunca toca un presupuesto emitido**: el
   ítem tiene su copia. Una vigencia no puede dejar de cubrir el día de un
   presupuesto emitido que la cita.
4. Si el arancel vigente hoy difiere del snapshot (otro arancel, o el
   citado se corrigió o se borró después), el detalle muestra un banner
   informativo. La única acción ofrecida es **duplicar**. No existe
   "actualizar precios de este presupuesto".
5. Los overrides de cobertura viven en el ítem (`cobertura_override_*`),
   nunca escriben en `aranceles`.

Si algo de esto se relaja, el consultorio pierde la capacidad de
defender un presupuesto viejo frente a un paciente. Es el requisito no
funcional más importante del sistema.

## Fuentes de verdad

| Qué | Dónde |
|---|---|
| Cálculo de cobertura y a-cargo | `lib/calculo.ts` **y** `calcular_cobertura()` en SQL — tienen que dar el mismo número |
| Formato de moneda y fechas es-AR | `lib/formato.ts` |
| Lectura del Excel mensual de aranceles | `lib/importar-aranceles.ts` (celdas → filas); qué pasa con cada fila lo decide `importar_aranceles()` en SQL |
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
