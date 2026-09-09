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
| 5 | Un presupuesto emitido no vuelve a borrador, ni cambia de contenido | Trigger `trg_presupuesto_emitido` (no sólo la RPC: PostgREST expone un UPDATE por tabla) |
| 6 | El historial no se borra ni se edita | Trigger `trg_evento_inmutable`, policies sólo SELECT/INSERT |
| 7 | Un arancel usado no cambia de prestación ni de obra social | `guard_arancel_inmutable` |
| 8 | Un ítem no puede quedar con a-cargo negativo | Checks de `presupuesto_items` + tope en `calcular_cobertura` y `calcularItem` |

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
| `20260101000500_items_check.sql` | Checks de coherencia del ítem congelado |
| `20260101000600_vigencia_por_fecha.sql` | «Vigente» pasa a resolverse por fecha |
| `20260101000700_guardas_en_la_base.sql` | Las guardas del snapshot, fuera de la RPC |
| `20260101000800_duplicar_fiel.sql` | Duplicado fiel: cuotas y obra social por ítem |
| `20260101000900_reloj_sin_respuesta.sql` | El reloj de «días sin respuesta» no se resetea |
| `20260101001000_paridad_redondeo.sql` | Redondeo idéntico al del cliente |
| `20260101001100_alta_historial.sql` | Historial honesto y cuotas validadas |
| `20260101001200_aumento_exacto.sql` | El aumento masivo escribe lo que promete |
| `20260101001300_duplicado_afiliado.sql` | Duplicado coherente y conteo de usos agregado |
| `20260101001400_admin.sql` | `es_admin` en `profesionales` + guarda de escalada |

**Sin la CLI**: `supabase/instalar.sql` e `instalar-storage.sql` son las mismas
migraciones concatenadas en orden, para pegar en el SQL Editor de Supabase. Se
generan con `npm run sql:instalar` y **no se editan a mano**: la fuente de
verdad son las migraciones, y los dos archivos se regeneran en el mismo commit
que las toca.

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
| `calcular_cobertura(monto, tipo, valor)` | Espejo SQL de `lib/calculo.ts`, con la cobertura acotada a `[0, monto]`. **Si cambia una, cambia la otra**; `npm run test:paridad` lo verifica contra una base real |
| `arancel_vigente(prestacion, obra_social, fecha)` | El arancel que rige en una fecha. Única definición de «vigente» |
| `actor_nombre()` | Nombre legible del usuario para los eventos |
| `nueva_vigencia(...)` | Cierra la vigencia abierta e inserta la nueva, atómico |
| `aumento_masivo(rubro, os, solo_particular, pct, desde)` | Una llamada a `nueva_vigencia` por fila, en una transacción |
| `crear_presupuesto(jsonb)` | Congela cabecera + ítems + cuotas + evento. Inserta como borrador y promueve el estado al final (lo exige `guard_item_emitido`) |
| `duplicar_presupuesto(uuid)` | Copia re-resolviendo contra los aranceles vigentes hoy |
| `cambiar_estado(id, estado, motivo, nota)` | Transición + evento. Bloquea la vuelta a borrador |
| `registrar_evento(id, tipo, desc)` | Evento suelto (nota, PDF, WhatsApp) |
| `marcar_pendientes()` | `enviado → pendiente` a los 7 días. Sólo `service_role` |

### Vistas

- `aranceles_vigentes` — lo que rige **hoy** (`vigente_desde <= hoy` y
  `vigente_hasta` nulo o futuro), con `usos` por arancel. Es la grilla de la
  pantalla 10 y la base del banner de precio desactualizado.
- `aranceles_programados` — aumentos ya cargados que todavía no arrancaron.
  Sin esta vista, arreglar la anterior los haría desaparecer de la pantalla.
- `aranceles_usos` — cuántos presupuestos emitidos usan cada arancel. Es una
  fila por arancel: contar sobre `presupuesto_items` se corta en el `max_rows`
  de PostgREST, y de ese número depende el sello «no editable».
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
- `estado_desde` se reinicia en cada cambio de estado **menos** en
  `enviado → pendiente`: ese pase no es una respuesta del paciente, así que el
  reloj de «días sin respuesta» sigue corriendo desde que se envió. Si se
  reiniciara, el tinte warm del kanban recién aparecería a los 14 días.
- Un presupuesto emitido **no vuelve a borrador**: eso reabriría sus ítems a
  edición y rompería la regla del snapshot.

---

## 6 · Pantallas

| # | Ruta | Estado |
|---|---|---|
| 01 | `/login` | Usuario + contraseña |
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
| `SUPABASE_SERVICE_ROLE_KEY` | **sólo server** | Alta de usuarios, route del PDF y cron |
| `CRON_SECRET` | server | Valida `/api/cron/pendientes` |

Los datos del consultorio que salen en el PDF **no son variables de entorno**:
son constantes en `lib/pdf/consultorio.ts`. El consultorio es uno solo y no
cambian entre entornos; tenerlos en Vercel obligaba a cargar cuatro variables
en tres entornos para un dato que se escribe una vez.

## Acceso

Usuario + contraseña, sin mail de por medio. Supabase Auth exige un mail para
el login con contraseña, así que se deriva uno interno del usuario
(`admin` → `admin@smilelab.com.ar`); ese mail no se muestra nunca y no recibe
correo.

La primera vez que se abre `/login`, si el consultorio todavía no tiene ningún
administrador se crea **`admin` / `smilelab`** y se avisa en pantalla. Es
idempotente: a partir del segundo arranque no hace nada.

Un admin da de alta al resto desde **Equipo y accesos** (`/equipo`): crea el
acceso y la ficha del profesional de una sola vez, cambia contraseñas y da de
baja. `es_admin` vive en `profesionales`, y un trigger impide que alguien que
no administra se dé permisos a sí mismo — la RLS deja escribir a todo el
equipo, así que sin esa guarda alcanzaba un UPDATE directo.

En **Supabase Auth**: proveedor **Email** activado con contraseña, **«Confirm
email» apagado** y signups abiertos deshabilitados. No hace falta configurar
Redirect URLs: no hay magic link.

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

- [x] Suite de tests del núcleo: `npm test` (40 casos sobre `lib/calculo.ts`,
      `lib/formato.ts` y `lib/estados.ts`) y `npm run test:paridad`, que
      compara `calcularItem` contra `calcular_cobertura()` en una base real.
      Los casos compartidos viven en `tests/casos-cobertura.json`.

### Revisión adversarial · qué encontró y cómo quedó

Se revisó el código con ocho lentes independientes y se verificó cada hallazgo
antes de aceptarlo. Los que resultaron reales:

| Qué pasaba | Cómo se arregló |
|---|---|
| Una vigencia con fecha futura se cotizaba como si rigiera hoy: programar el aumento de octubre lo aplicaba en septiembre | «Vigente» pasa a resolverse por fecha (`arancel_vigente`, vista `aranceles_vigentes`); los programados se muestran aparte |
| Un `UPDATE` directo devolvía a `borrador` un presupuesto emitido y reabría sus ítems | Trigger `trg_presupuesto_emitido`: la guarda deja de vivir sólo en la RPC |
| Un arancel usado se podía reapuntar a otra prestación u obra social | `guard_arancel_inmutable` congela también `prestacion_id` y `obra_social_id` |
| Un override de más de 100 % dejaba el a-cargo negativo | Cobertura acotada a `[0, monto]` en TS y SQL + checks en `presupuesto_items` |
| El banner de precio desactualizado se disparaba por los overrides del propio presupuesto | Se decide por identidad del arancel citado, no por diferencia de totales |
| Al duplicar, las cuotas se redondeaban una a una y no cerraban contra el total | La última absorbe el resto, igual que en `crear_presupuesto` |
| Al duplicar, un ítem cargado «con valor particular» se re-cotizaba contra la obra social | Cada ítem se re-cotiza contra la obra social de su propio arancel |
| El pase automático a `pendiente` reiniciaba el reloj: el aviso de 7 días era inalcanzable | `estado_desde` se conserva en `enviado → pendiente` |
| El cron nunca corría: el proxy mandaba `/api/cron` al login | `/api/cron` se exceptúa del proxy; se autentica con `CRON_SECRET` |
| Cambiar la obra social en el paso 1 dejaba los ítems con la cobertura anterior | El paso 1 re-cotiza los ítems y avisa qué cambió |
| Un corte de red durante un arrastre dejaba la tarjeta congelada | `mover()` con `try/catch/finally` y rollback |
| Un tratamiento `iniciado` se degradaba arrastrándolo y no se distinguía de `aceptado` | Badge propio en la tarjeta y arrastre bloqueado con aviso |
| Setear estado dentro de efectos provocaba renders en cascada (React 19) | Reseteo por `key`, derivación en render y `useSyncExternalStore` para el borrador |
| `lib/calculo.ts` y `calcular_cobertura()` diferían un peso con porcentajes de dos decimales (float vs `numeric`) | Los dos multiplican antes de dividir; el barrido de `npm run test:paridad` lo vigila |
| El preview del aumento masivo prometía un monto y la RPC escribía otro | Misma cuenta en los dos lados (`montoConAumento`) |
| El evento «creado» contaba las prestaciones como condiciones de pago | Contador propio; el historial es append-only y esa línea no se corrige después |
| Unos porcentajes que no sumaban 100 abortaban la emisión con un error de Postgres crudo | Se valida antes, con un mensaje que se entiende |
| El KPI de aceptación mostraba la tasa de 90 días sobre la base de 30 | Cada porcentaje con su base |
| El primer envío por WhatsApp proponía la plantilla de recordatorio | La plantilla se decide por el historial de envíos, no por el estado |
| Cerrar sesión dejaba el borrador —con nombre del paciente— en el navegador compartido | El logout lo borra en los dos lugares donde se cierra sesión |
| Un `?prof=` que no era uuid dejaba la home y el pipeline trabados | Los filtros descartan lo que no es uuid |
| `esBorrador` validaba 6 de 16 campos: un borrador viejo rompía el wizard | Valida también la forma de cada ítem y cada cuota |
| El duplicado mezclaba la obra social del original con el afiliado actual del paciente | El afiliado sólo se refresca si la ficha sigue en la misma obra social |
| El conteo de usos del histórico se cortaba en las 1000 filas de PostgREST, y de él depende el sello «no editable» | Vista `aranceles_usos`: una fila por arancel en vez de una por ítem |
| La confirmación del envío afirmaba «quedó como Enviado» aunque el estado no se hubiera tocado | Reporta lo que devolvió el servidor, no lo que se pidió |
| El mínimo táctil de 44px en mobile se cumplía a mano y sólo a veces: 63 botones sin `size`, 21 en `sm` y el `Segmented` quedaban en 28-34px | La altura arranca en 44px y baja a la nominal recién en `md:`, dentro del propio variant |
| Elegir el paciente antes de que resolviera el listado de obras sociales dejaba el presupuesto en Particular, sin avisar | Se consulta esa obra social puntual; si tampoco se puede, se avisa en vez de asumir |
| Restaurar la cobertura al valor del arancel borraba el motivo del override aunque el monto siguiera editado | El motivo se borra sólo cuando el ítem deja de estar editado |
| Las condiciones de pago borradas a propósito reaparecían al volver del paso 2 al 3 | La marca de «ya heredadas» vive en el borrador, no en un `useRef` que se reinicia al desmontar |
| Se podía llegar al paso 2 sin profesional y el error aparecía recién al guardar | «Siguiente» bloquea el paso 1 incompleto y dice qué falta |

### Pendiente

- [ ] Tests de componentes y de integración (hoy la suite cubre el núcleo de
      cálculo, formato y estados, no la UI).
- [ ] Reporte de pérdidas por motivo y período (hoy sólo la franja del kanban).
- [ ] Registro de autorizaciones previas de obra social.
- [ ] Cuotas con interés o financiación en más de dos pagos.
- [ ] Recordatorio automático a los 7 días por WhatsApp (hoy sólo se promete en
      la confirmación de envío; el cambio de estado sí es automático).
- [ ] Decidir si un presupuesto con subtotal $ 0 debe rechazarse. Hoy se
      permite: un ítem sin cargo es raro pero no imposible, y el número se ve
      en el preview antes de guardar. Bloquearlo impediría presupuestar una
      prestación de cortesía sola.
- [ ] Confirmar con el consultorio el formato de teléfono: `telefonoWhatsApp`
      arma `54 9 + área + abonado` y descarta el `15`, que es lo que exige
      WhatsApp para un celular argentino.

---

## 10 · Cómo se verifica

- `npm run build` · `npm run typecheck` · `npm run lint` — sin errores.
- `npm test` — 45 casos sobre `lib/calculo.ts`, `lib/formato.ts` y `lib/estados.ts`.
- `npm run sql:instalar` — regenera los scripts del SQL Editor desde las
  migraciones. Correr después de tocar cualquier migración.
- `npm run test:paridad` — 220 casos comparando `calcularItem` contra
  `calcular_cobertura()` en una base real. **Es el que hay que correr después
  de tocar cualquiera de los dos.**
- Las guardas de la regla del snapshot se probaron contra un Postgres real
  aplicando las migraciones desde cero: cada regla se intentó violar y tiene
  que fallar (ítems de un emitido, arancel usado, borrado de aranceles,
  edición del historial, vuelta a borrador, reapuntado de un arancel).

## 11 · Por confirmar con el consultorio

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
