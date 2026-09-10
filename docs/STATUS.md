# Estado del proyecto — Smile Lab · Presupuestos

> **Última actualización:** 2026-09-10
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
- **Un cliente de Supabase por request** (server) y **uno por pestaña**
  (browser). `createClient()`, `getUsuario()` y `getPerfil()` de
  `lib/supabase/server.ts` van envueltos en `cache()` de React: `auth.getUser()`
  es un viaje de red y lo piden el layout y cada server action. En el navegador,
  `lib/supabase/client.ts` memoiza la instancia: varios `GoTrueClient` en la
  misma página se pisan al renovar el token.
- **Hora del consultorio, no del proceso.** Vercel corre en UTC y la mitad de
  las pantallas se renderiza en el servidor, así que `lib/formato.ts` lleva todo
  instante a `America/Argentina/Buenos_Aires` con `Intl` antes de formatearlo.
  Un `YYYY-MM-DD` pelado es un día del calendario y **no** se convierte.
- **PWA mínima**: `app/manifest.ts`, `app/icon.svg` y `app/apple-icon.png`. La
  app se usa desde el celular todo el día y «Agregar a inicio» tiene que dar
  una app, no un marcador de Safari.

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
| `20260101001500_guarda_alta_admin.sql` | La guarda de `es_admin` cubre también el `INSERT`, con el rol de servicio exento |
| `20260101001600_estadisticas.sql` | Las funciones `stats_*` que agregan la historia para la pantalla 15 |
| `20260101001700_agujeros.sql` | Un ítem no se muda de presupuesto · el vínculo de identidad (`user_id`) y la baja son permisos · el historial se firma en el servidor |
| `20260101001800_estadisticas_honestas.sql` | La serie mensual arranca donde arranca el consultorio · el ticket de un mes vacío es `null`, no 0 |
| `20260101001900_alta_idempotente.sql` | `presupuestos.clave_alta` + índice único parcial · `crear_presupuesto` devuelve el documento que ya emitió esa clave, incluso con dos pedidos a la vez · la clave queda congelada al emitir |
| `20260101002000_arancel_append_only.sql` | Append-only literal: desde una sesión del equipo NINGUNA columna de `aranceles` se edita (antes sólo si el arancel ya estaba usado) · no pueden regir dos precios el mismo día para la misma celda · una vigencia no se cierra antes del presupuesto emitido que la cita |

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
| `presupuestos` | Cabecera + snapshot de contexto + totales congelados. `clave_alta` es la clave de idempotencia del alta (única, parcial) |
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
- `presupuestos_clave_alta_key` — único parcial sobre `clave_alta`: es lo que
  convierte un reintento del wizard en el mismo documento en vez de en uno
  nuevo. Parcial porque los presupuestos anteriores y los duplicados no
  llevan clave.

### Funciones y RPC

| Nombre | Qué hace |
|---|---|
| `calcular_cobertura(monto, tipo, valor)` | Espejo SQL de `lib/calculo.ts`, con la cobertura acotada a `[0, monto]`. **Si cambia una, cambia la otra**; `npm run test:paridad` lo verifica contra una base real |
| `arancel_vigente(prestacion, obra_social, fecha)` | El arancel que rige en una fecha. Única definición de «vigente» |
| `actor_nombre()` | Nombre legible del usuario para los eventos |
| `nueva_vigencia(...)` | Cierra la vigencia abierta e inserta la nueva, atómico |
| `aumento_masivo(rubro, os, solo_particular, pct, desde)` | Una llamada a `nueva_vigencia` por fila, en una transacción |
| `crear_presupuesto(jsonb)` | Congela cabecera + ítems + cuotas + evento. Inserta como borrador y promueve el estado al final (lo exige `guard_item_emitido`). **Idempotente por `clave_alta`**: si esa clave ya emitió un documento devuelve ese mismo, incluso si dos pedidos llegan a la vez |
| `duplicar_presupuesto(uuid)` | Copia re-resolviendo contra los aranceles vigentes hoy |
| `cambiar_estado(id, estado, motivo, nota)` | Transición + evento. Bloquea la vuelta a borrador |
| `registrar_evento(id, tipo, desc)` | Evento suelto (nota, PDF, WhatsApp) |
| `marcar_pendientes()` | `enviado → pendiente` a los 7 días. Sólo `service_role` |
| `stats_ganado(estado)` | Qué cuenta como aceptado. **Misma definición que la Home**: `aceptado` o `iniciado` |
| `firmar_evento()` | Trigger que reescribe autor y fecha del historial con lo que dice el servidor: el cliente los mandaba en el body |
| `stats_resumen`, `stats_embudo`, `stats_tiempos`, `stats_mensual`, `stats_motivos`, `stats_obras_sociales`, `stats_prestaciones`, `stats_profesionales`, `stats_pacientes`, `stats_aging`, `stats_precios` | Las once lecturas de la pantalla 15. Todas `stable` y con derechos de invocador: la RLS sigue mandando |

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
| 02 | `/` | Home con datos: 4 KPIs + tabla desktop / cards mobile, paginada de a 50 con total exacto (`?p=`) |
| 03 | `/` (vacía) | KPIs en `—` punteado + dos salidas |
| 04-06 | `/?nuevo=1` | Wizard 3 pasos, modal sobre la ruta actual |
| 07-08 | — | Comboboxes con creación al vuelo; prestación encadena arancel |
| 09 | `/biblioteca` | Tabs de entidades |
| 10 | `/biblioteca/aranceles` | Grilla, drawer de vigencias, aumento masivo |
| 11 | `/presupuestos/[id]` | Detalle, banner de precio, timeline |
| 12 | `/pipeline` | Kanban desktop, franja de perdidos al pie |
| 13 | `/api/presupuestos/[id]/pdf` | A4, cacheado en Storage mientras el presupuesto esté emitido |
| 14 | — | Sheet de WhatsApp (`?whatsapp=1` en el detalle) |
| 15 | `/estadisticas` | Embudo, series mensuales, tiempos por etapa, motivos de pérdida, antigüedad de lo abierto y tablas por obra social, tratamiento y profesional |
| 15 | `/equipo` | Equipo y accesos (sólo admin): alta, contraseña, baja |
| 16 | `/equipo/mi-cuenta` | Cambiar la propia contraseña |

Notas de diseño cerradas:

- El wizard es un **modal sobre la ruta actual** (`?nuevo=1`), no una ruta
  propia: al cerrar, el listado de atrás no se recarga.
- El pipeline **no es un cuarto destino de navegación**: filtro de estado en
  mobile, vista alternativa en desktop.
- **Perdido va al pie del kanban**, no como columna.
- En el kanban, cada arrastre confirma con un toast que ofrece **Deshacer**: el
  gesto es barato y el historial es append-only, así que deshacer escribe el
  paso inverso —queda en el timeline— en vez de borrar nada.
- Una tarjeta `iniciado` **no levanta**: el «no» llega antes del gesto y no
  después de soltar. El estado se corrige desde el detalle.
- El tablero entra en el viewport: las columnas scrollean por adentro (para que
  su encabezado con conteo y monto quede siempre a la vista) y la franja queda
  al pie. El alto se mide, no se estima.
- Crear una prestación **exige** cargar su arancel en el mismo flujo.
- El wizard se maneja con teclado: `/` vuelve al buscador de prestaciones,
  ⌘/Ctrl + ⏎ dispara la acción principal del paso, y en desktop el buscador
  queda abierto después de agregar para encadenar prestaciones. En los
  mini-forms, ⏎ desde un input de una línea manda (⌘/Ctrl + ⏎ desde un
  textarea).
- Los overrides son internos: **no aparecen en el PDF** —ni en la impresión
  del detalle desde el navegador, que es el mismo documento en papel.
- El **caché del PDF se invalida por la regla del producto, no por fecha**: un
  presupuesto emitido no cambia de contenido (`guard_presupuesto_emitido` +
  `guard_item_emitido`), así que si hay objeto en el bucket, ese objeto **es**
  el documento. Se regenera sólo si todavía es borrador o si el archivo no
  está (firmar una ruta inexistente falla, y esa falla es la señal). Comparar
  contra `updated_at` re-renderizaba el mismo documento en cada cambio de
  estado y llenaba el historial de «Se generó el PDF».
- La route del PDF pide **la cabecera sola** para decidir si hay caché; ítems y
  cuotas se traen sólo cuando hay que renderizar. Con el caché caliente son
  dos viajes: una consulta y una firma.
- **Mantener apretado el ícono** en el celular abre «Nuevo presupuesto»
  (`/?nuevo=1`) y «Seguimiento» (`/pipeline`): son los `shortcuts` del manifest.
- El detalle se maneja con teclado: `W` abre el envío por WhatsApp, `E` el
  cambio de estado y `P` el PDF, con la tecla a la vista en cada botón.
- El cambio de estado del detalle es **optimista**: el badge, las
  transiciones sugeridas, el reloj de días y el monto se mueven en el mismo
  frame del click, y vuelven solos si la escritura falla.
- Mobile nunca usa tabla. Área táctil mínima 44px, FAB 56px. En el detalle,
  la barra fija **muestra** el estado en vez de nombrar la acción: es el dato
  que queda fuera de la vista al scrollear.
- En mobile la última pestaña de la tabbar es **Cuenta**, y no es un destino:
  abre una hoja con «Mi contraseña», «Equipo y accesos» (si administra) y
  «Cerrar sesión». El menú de usuario vive en la topbar, que es `hidden md:`,
  así que sin esta hoja **desde el celular no había forma de cerrar sesión**.
  La abre la tabbar y la monta la topbar, con el estado en una tienda de
  módulo (`components/shell/cuenta.tsx`): son hermanos y el layout no se toca.
- El listado de la home se **pagina** (50 por página, `?p=`, con el total
  exacto de `count: 'exact'`), no se corta. Traía 200 filas de una y la única
  salida ofrecida era «achicá el rango de fechas»: con 500 presupuestos, los
  300 más viejos eran inalcanzables. Una página fuera de rango cae en la
  última que existe en vez de leerse como «no hay nada».
- **Estadísticas es pestaña en mobile; Equipo no.** «Equipo y accesos» ya vivía
  en la hoja de cuenta junto con «Mi contraseña» y «Cerrar sesión», que es
  donde uno busca las cosas de su acceso: tenerlo además en la tabbar
  duplicaba la puerta y hacía que la barra cambiara de forma según el rol
  —cuatro pestañas para el admin, tres para el resto, y el pulgar aprendiendo
  dos mapas—. Ese lugar lo ocupa Estadísticas, que es contenido.
- Atajos globales del shell: `1` Home, `2` Pipeline, `3` Biblioteca y `?` la
  chuleta con todos. La tecla se dibuja en cada ítem de la topbar y la lista
  está también en el menú de usuario, que es de dónde se entera alguien que no
  usa atajos. Las teclas salen de `components/shell/atajos.ts`: la misma lista
  que registra el handler y que se muestra en pantalla.

---

## 7 · Diseño

Tokens en `@theme` dentro de `app/globals.css`. Tipografía Sora (display) +
Manrope (UI) vía `next/font/google`.

Ocho estados con **un solo hue en escala de intensidad**, no ocho colores. Cada
badge lleva punto de 6px **y** texto: el color nunca es el único portador de
significado. La paleta literal vive en `ESTILO_ESTADO` (`lib/estados.ts`).

Todo monto lleva `font-variant-numeric: tabular-nums` y se formatea con
`money()` → `$ 128.400`.

**Gráficos.** El acento de marca queda en 2.9:1 contra el blanco: alcanza para
un botón con texto encima, no para una línea de 2px que hay que seguir con la
vista. `--color-serie` es el mismo tono un paso más hondo, elegido corriendo un
validador de paleta —pasa banda de luminosidad, piso de croma, contraste ≥3:1 y
separación para daltonismo contra la serie negativa (ΔE 15.7 en deuteranopía)—.
La rampa `--color-rampa-1..6` es **un solo tono** de claro a oscuro con
luminosidad monótona: la usan las barras, donde el color acompaña la magnitud o
la profundidad de la etapa, nunca el ranking. Pintar por ranking haría que al
reordenarse los datos se repintaran las barras.

Ningún gráfico usa dos escalas en un mismo eje. Cuando hay dos unidades
—cantidad y pesos— van en dos gráficos, porque un eje doble deja «demostrar»
cualquier correlación moviendo una de las dos escalas.

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
idempotente: a partir del segundo arranque no hace nada. Ese chequeo va en un
`<Suspense>` propio (`app/(auth)/login/aviso-admin.tsx`) y **nunca lanza**: es
lo único del login que necesita la service role key, y si falta —o si Supabase
tarda— el formulario tiene que aparecer igual.

Un admin da de alta al resto desde **Equipo y accesos** (`/equipo`): crea el
acceso y la ficha del profesional de una sola vez, cambia contraseñas y da de
baja. `es_admin` vive en `profesionales`, y un trigger impide que alguien que
no administra se dé permisos a sí mismo — la RLS deja escribir a todo el
equipo, así que sin esa guarda alcanzaba un UPDATE directo.

Esa guarda cubre **el alta y la edición**. Con sólo el `UPDATE` custodiado,
un usuario de auth sin ficha podía crearse la suya con `es_admin = true`
desde el navegador, con la anon key y sin pasar por la app. El rol de
servicio queda exento a propósito: llega por código de servidor que ya
verificó quién pide, y `asegurarAdminInicial()` corre justamente cuando
todavía no hay contra quién verificar.

El alta está pensada para lo que pasa en el mostrador: **la contraseña se
sugiere** (tres grupos de cuatro, sin caracteres que se confundan al dictar),
el usuario se propone a partir del nombre, ⏎ manda desde cualquier campo, y al
terminar la pantalla muestra usuario + contraseña con un botón que **copia las
dos líneas juntas** para pegarlas en WhatsApp. Es la única oportunidad de
verlas: no se guardan en claro. Cambiar la contraseña de alguien termina en la
misma pantalla.

«Al menos un administrador» se cuenta sobre los que **pueden entrar**: activos y
con `user_id`. Una ficha admin dada de baja no puede dar de alta a nadie, así
que contarla dejaba pasar el caso que la guarda quería evitar. Nadie se da de
baja a sí mismo, y quitarse el permiso de administrar se confirma aparte: es
una puerta de una sola mano.

**Cerrar sesión es `scope: 'local'`.** El default de supabase-js revoca todos
los refresh tokens del usuario: con la recepción, la tablet y un celular
entrando con el mismo usuario, salir en un lado echaba a los otros dos.

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
- [x] Login con usuario + contraseña, y bootstrap del admin inicial (pantalla 01)
- [x] Shell: topbar desktop con atajos, tabbar + FAB + hoja de cuenta en mobile
- [x] Home con KPIs, filtros en URL (búsqueda, estado, profesional, obra
      social y fechas; sheet propio en mobile), paginado de a 50 por URL,
      tabla desktop y cards mobile (02-03)
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
| El kanban no mostraba dónde iba a caer la tarjeta: `pointerWithin` resolvía sobre la tarjeta de abajo del puntero, así que `isOver` daba falso en toda columna con tarjetas | La detección de colisiones se limita a las zonas gruesas (cinco columnas + franja) y la columna destino se prende, con un hueco punteado en el índice exacto |
| El optimismo del kanban ponía «hoy» también en `enviado → pendiente`, donde el trigger conserva el reloj: la tarjeta perdía el tinte warm justo cuando había que llamar | `diasTrasMover()` pinta lo que va a dejar la base |
| La tarjeta movida no se reordenaba y saltaba de lugar al llegar la revalidación | Las columnas se ordenan en el cliente con el mismo criterio que el servidor (`ordenTablero`) |
| Un override optimista que quedaba en el mapa revivía si el presupuesto volvía a su estado anterior desde afuera | Se descartan los vencidos en el mismo render en que llega el servidor |
| Mover con el teclado dejaba el foco en el `body`: la tarjeta se remonta en otra columna | El foco vuelve a la tarjeta por id, sólo si el arrastre arrancó con teclado |
| El alto de las columnas era `calc(100dvh - 330px)`: con los filtros en dos líneas o el banner de error, la página volvía a scrollear y los encabezados se iban | `useAltoTablero` mide el espacio real y lo recalcula con cada resize |
| Los `input type=date` del pipeline aplicaban en cada `input` del DOM: corregir un año disparaba cuatro navegaciones con fechas intermedias | Se aplican al salir del campo, con Enter, o medio segundo después de la última tecla |
| `/pipeline` heredaba el esqueleto de la home (KPIs y tabla) y al llegar los datos se desarmaba entero | `app/(app)/pipeline/loading.tsx` calca el kanban |
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
| El paso 3 marcaba «ya heredé las condiciones de pago» antes de que llegara la plantilla: volver al paso 2 mientras viajaba dejaba el presupuesto sin condiciones, y sin avisar | La marca se escribe junto con las cuotas, no antes de pedirlas |
| Una condición de pago sin nombre la rechazaba la base al guardar, con el presupuesto entero cargado | Nacen con nombre sugerido, la fila vacía se marca en pantalla y «Guardar» dice qué falta |
| El último campo tipeado se perdía si el wizard se cerraba dentro del debounce del autoguardado | Al pasar a wizard cerrado se escribe lo pendiente; un contador de descartes evita que esa escritura resucite un borrador ya emitido |
| Elegir dos pacientes seguidos podía aplicar la re-cotización vieja: cabecera con una obra social e ítems cotizados con la otra | Turno por elección; la respuesta que llega tarde se descarta |
| El doble alta dependía del `disabled` del botón, que necesita un render; tres botones y un atajo llaman a lo mismo | Guarda con `ref`, cerrada en el mismo tick del primer click |
| Un error del servidor se iba con el toast y dejaba el presupuesto cargado sin explicación | Banner persistente con «Reintentar», «Ir al paso N» y el aviso de que no se perdió nada |
| Una caída de red durante la RPC llegaba como el error genérico de una server action, y los errores crudos de Postgres se mostraban tal cual | `try/catch` alrededor de la RPC, traducción a algo accionable y el crudo al log del servidor |
| El preview del paso 3 y el PDF impreso no coincidían: condiciones de pago, cobertura sin cubrir, código de prestación, etiqueta de la cobertura y el cierre con la firma | El preview replica las mismas reglas de `lib/pdf/documento.tsx` |
| «Guardado 14:32» sólo existía en el paso 1, que es donde menos falta hace | El sello vive en la barra de pasos, a la vista en los tres |
| En mobile el teclado virtual tapaba el campo activo y el pie sticky: el sheet es `dvh` y Vaul está con `repositionInputs={false}` | `useTecladoVirtual` sube y achica el sheet con `visualViewport` y centra el campo enfocado |
| Quitar una prestación borraba de una el detalle, el monto editado y el motivo del override | «Deshacer» en el aviso, y vuelve a su posición |
| El banner de precio comparaba un ítem cargado «con valor particular» contra el arancel de la obra social: se disparaba sin que nada hubiera cambiado y prometía un número que «Duplicar» no produce | La re-cotización distingue «arancel particular» (obra social `null`) de «sin dato» —el `??` pisaba el null— y ordena las vigencias como `arancel_vigente()`, que es lo que usa la RPC |
| Una lectura fallida del detalle terminaba en el 404: la pantalla decía «acá no hay nada» y parecía que el presupuesto se había borrado | La lectura distingue error de inexistente, con `error.tsx` y `not-found.tsx` propios de la ruta, adentro del shell y con salida al listado |
| Desde una computadora no había forma de abrir el envío por WhatsApp: la única entrada era la barra de mobile o llegar con `?whatsapp=1` | Acción principal en la cabecera del detalle, con atajo `W` |
| Dos clicks rápidos en «Duplicar» creaban dos presupuestos: el `disabled` necesita un render y son tres botones que llaman a lo mismo | Guarda con `ref`, cerrada en el mismo tick del primer click |
| El historial anotaba «con el PDF adjunto» por tener el archivo preparado, aunque el mensaje hubiera salido sin él | `descripcionEnvio` recibe cómo salió de verdad: adjunto, link o nada |
| Un duplicado que ya se había enviado volvía a proponer la plantilla «Actualización», el mismo texto que el paciente ya había recibido | El historial de envíos manda sobre la condición de duplicado |
| El sheet de WhatsApp mostraba el borrador, no lo que llega: el link firmado se pega al enviar y el adjunto no aparecía en ningún lado | Vista previa de cómo llega —con adjunto o con link— y un toque para editar; en mobile deja de arrancar con un textarea de 210px |
| Sin teléfono cargado, «Enviar» quedaba apagado aunque el teléfono pudiera compartir: se podía elegir el contacto desde WhatsApp | El envío elige la vía (adjunto, chat o selector de contacto) y sólo se bloquea cuando no hay ninguna |
| El timeline repetía la fecha completa en cada línea y tiraba el motivo de la pérdida, que es justo lo que se busca al abrirlo | Agrupado por día («Hoy», «Ayer», «3 sep»), hora al costado, autor destacado y el motivo a la vista |
| Imprimir el detalle desde el navegador sacaba topbar, FAB, botones, seguimiento y notas internas en el papel, y con las cards de mobile en vez de la tabla | Reglas `@media print` de la pantalla: sólo el documento, con la tabla, sin lo interno |
| Desde el celular **no se podía cerrar sesión ni cambiar la contraseña**: las dos vivían sólo en el menú de la topbar, que es `hidden md:block`. En un consultorio donde el teléfono pasa de mano en mano, la sesión quedaba abierta | Pestaña «Cuenta» en la tabbar, con hoja de «Mi contraseña», «Equipo y accesos» y «Cerrar sesión» |
| Cerrar sesión usaba el `scope` global de supabase-js: salir en la recepción echaba también a la tablet y al celular, que entran con el mismo usuario | `signOut({ scope: 'local' })` |
| Sin `SUPABASE_SERVICE_ROLE_KEY` **no entraba nadie**: `/login` corría el bootstrap del admin inicial, `createAdminClient()` lanzaba y se caía la pantalla entera de entrar. El login con contraseña no necesita esa clave | El bootstrap no lanza y viaja en su propio `<Suspense>`: el formulario pinta primero |
| Si el gestor de contraseñas completaba el login antes de hidratar, los `useState` quedaban vacíos: el formulario se veía lleno y «Entrar» contestaba «Completá usuario y contraseña» | Los campos son no controlados y se leen del `FormData` del submit |
| Con Supabase lento el botón volvía a «Entrar» apenas contestaba, mientras la navegación seguía viajando: se leía como que no había pasado nada y se volvía a clickear. Y si no contestaba nunca, giraba para siempre | El estado de carga dura hasta que cambia la pantalla, se avisa a los 6s y se corta a los 25s |
| El error del login se pintaba en un `role="status"` que se montaba junto con el mensaje: un lector de pantalla no anunciaba nada | La región vive siempre y el foco vuelve a la contraseña |
| Los errores de GoTrue salían crudos y en inglés («User is banned», «Unable to validate email address») desde el alta y el cambio de contraseña | `traducirErrorAuth()`, compartida por el login y las acciones de equipo |
| El alta de un usuario terminaba con la contraseña sólo en la cabeza de quien la tipeó: el modal se cerraba y no se puede volver a ver | Se sugiere una, y al crear se muestran usuario y contraseña con «Copiar usuario y contraseña» |
| «Cancelar» en el alta no limpiaba el formulario —`onOpenChange` no corre cuando el `open` lo baja el padre—: la contraseña del anterior seguía escrita al reabrir | Los modales se montan por apertura y se desmontan al cerrar |
| En los modales de equipo ⏎ no mandaba: el de contraseña tiene **un** campo y había que ir al mouse igual | Formulario con `id` y botones del footer con `form=` |
| «Tiene que quedar al menos un administrador» contaba fichas admin sin mirar si podían entrar: con dos admins y uno dado de baja, se le podía sacar el permiso al único activo | Se cuentan los admin **activos y con acceso**, y quitarse el permiso a uno mismo se confirma |
| Dar de baja escribía primero la ficha y después el ban: si el ban fallaba, la pantalla decía «sin acceso» con la persona todavía pudiendo entrar | Primero el acceso, después la ficha, y si la ficha falla se deshace el acceso |
| Los switches de «Administra» y la baja no se movían hasta que volvía el `router.refresh()`: dos segundos mirando algo que parece roto | Optimismo con rollback; el parche se descarta cuando llega data del servidor |
| `/equipo` y `/equipo/mi-cuenta` caían en el `loading.tsx` de la home: se veían KPIs y una tabla de presupuestos y después saltaba a otra pantalla entera | Esqueleto propio de cada una, calcando su layout |
| El FAB de mobile tapaba los últimos 48px del contenido: el colchón del layout es de 80px y el botón llega a 128 | La tabbar suma su propio colchón |
| Con la topbar sticky, cualquier cosa a la que el navegador scrollea —el campo al que se llega con Tab, un `#hash`, «buscar en la página»— aterrizaba tapada | `scroll-padding-top` con el alto de la barra, sólo en desktop |
| El 404 decía «el presupuesto que buscabas se eliminó», y los presupuestos no se borran nunca: quien llegaba desde un link viejo se iba creyendo que había perdido un documento | Dice qué pasó de verdad y ofrece buscarlo |
| El código del error del boundary había que transcribirlo a mano para buscarlo en los logs | Botón de copiar, y «Recargar» cuando reintentar no alcanzó |
| `asegurarAdminInicial()` no creaba nada: el `upsert` con `onConflict: 'user_id'` choca contra un índice único **parcial**, que Postgres no acepta como árbitro de `ON CONFLICT`. Fallaba también en una instalación limpia —el error es de planificación, no de conflicto— así que el consultorio quedaba con el acceso `admin` sin ficha: entraba, pero `/equipo` lo rebotaba a Home y nunca podía dar de alta a nadie | Se lee y después se escribe. Un `INSERT` cuando no hay ficha, un `UPDATE` cuando la hay y sólo falta el permiso |
| Un usuario de auth **sin ficha** podía darse `es_admin` con un POST directo a PostgREST: `guard_es_admin()` sólo miraba el `UPDATE` | La guarda cubre también el `INSERT` (migración 16), con el rol de servicio exento |
| Dar de baja en «Equipo y accesos» no sacaba el acceso: sólo sacaba a la persona del selector de profesional. Quien se iba del consultorio seguía entrando con su usuario y viendo todos los montos | La baja banea al usuario de GoTrue —reversible, la contraseña sigue siendo la misma— y el login lo dice con todas las letras |
| Home montaba las dos formas del listado a la vez (tabla oculta por CSS + cards) y las dos reclamaban el mismo `<ViewTransition name>`: React lo rechazaba, **ninguna** transición corría y quedaban 96 errores de consola. Del otro lado, el detalle nunca ponía su mitad del morph | `<TransicionPresupuesto variante>`: sólo la forma que el viewport muestra se queda con el nombre, y la cabecera del detalle es ahora el destino |
| El tablero cambiaba la lista de sensores de dnd-kit según el viewport, y `useSensorSetup()` la usa **como array de dependencias**: en cada carga en desktop React tiraba «the final argument passed to useEffect changed size between renders» | Los sensores son siempre los mismos: el kanban vive dentro de un `display:none` en mobile, de donde no se arrastra |
| `/pipeline` re-renderizaba entero al hidratar: dnd-kit numera el `aria-describedby` con un contador de módulo, que en el servidor sigue creciendo entre requests | `DndContext id` fijo |
| La matrícula salía **«MP MP 34.567»** en la cabecera del detalle, en la firma del PDF y en el WhatsApp: el campo es texto libre y se prefijaba sin mirar | `matricula()` en `lib/formato.ts`, que respeta lo que ya trae prefijo —MN incluida— y es la única que arma ese texto |
| En el carrusel de KPIs de mobile las etiquetas se cortaban: «EMITIDOS DEL …», «PENDIENTES D…» | Se parten en dos líneas, con la altura reservada para que los números queden alineados |
| En el paso 3 del wizard en mobile, «Cuándo» se encogía a cero y su etiqueta se imprimía encima de «Porcentaje» | El campo ocupa la fila completa hasta `sm`; el resto va abajo |
| En la grilla de aranceles, la banda de rubro se iba de pantalla al scrollear a la derecha: lo sticky era la celda, que mide lo que la tabla entera | Lo sticky pasa a ser el texto de adentro |
| En mobile el «Total a cargo» del pipeline quedaba flotando en el medio, arriba y a la derecha de su propio número | Alineado a la izquierda hasta `sm`, a la derecha desde ahí |
| Los dos filtros de la barra de Home arrastraban al trigger el texto del ítem por defecto —«Todos los profesionales»—, que a 180px entra o no entra según la fuente del sistema: en algunas máquinas se partía en dos líneas y esos dos controles quedaban más altos que Estado y Fechas | El trigger dice «Profesional» y «Obra social», la misma gramática que sus vecinos, y no envuelve nunca |
| `SelectValue asChild` metía un `Slot` de Radix sobre un Fragment: React lo marcaba en consola en cada render de la Home | El texto va como `children`, que consigue lo mismo sin envoltorio |
| Los rieles de las barras de estadísticas medían distinto en cada fila —el detalle de cada una se comía un ancho distinto—, así que dos barras del mismo largo no representaban el mismo valor | Columna de ancho fijo: el riel mide lo mismo en todas las filas del gráfico |
| En mobile los montos del encabezado de estadísticas se partían después del signo y se salían de su tarjeta | El número héroe escala con el ancho; 34px son 180px de «$ 4.528.600» en una tarjeta de 170 |
| **Un PATCH le sacaba los ítems a un presupuesto emitido.** `guard_item_emitido()` resolvía contra qué presupuesto validar con `coalesce(new, old)`, y en un UPDATE `new` nunca es null: miraba sólo el DESTINO. Mover los ítems a un borrador pasaba la guarda. Verificado: 2026-0002 quedó con 0 ítems cobrando $ 54.600 | Un ítem no cambia de presupuesto: es parte de ese documento (migración 18) |
| **Cualquiera del equipo se hacía admin** reapuntando `profesionales.user_id` a su propio uid en dos PATCH. La migración 16 custodiaba `es_admin` y se olvidó del vínculo de identidad, que es por donde `es_admin()` resuelve quién es quién. La misma maniobra dejaba al consultorio con cero admins con acceso | `user_id` y `activo` también son permisos: sólo un admin los cambia (migración 18) |
| **El historial se podía firmar a nombre de otro y con la fecha que uno quisiera**: el INSERT aceptaba `autor_id`, `autor_nombre` y `created_at` del body, y por diseño después nadie los puede corregir | Un trigger los reescribe con `auth.uid()`, `actor_nombre()` y `now()` |
| **Vaciar un campo de fecha con Backspace tumbaba la pantalla entera**: `format()` de date-fns tira `RangeError: Invalid time value` y el error subía hasta el boundary con el wizard a medio cargar | Las diez funciones de fecha de `lib/formato.ts` devuelven «—» en vez de tirar. El arreglo va en la fuente: taparlo en el wizard dejaba las otras nueve pantallas esperando el mismo Backspace |
| **El embudo se medía contra «realizado» y no contra lo emitido.** El wizard emite directo en «enviado» al cerrar mandando el WhatsApp —el camino más usado—, así que esos presupuestos quedaban fuera del denominador: etapas de más del 100 %, y si el consultorio siempre manda por WhatsApp TODO el embudo se dibujaba en 0 % con presupuestos en cada etapa | El universo es `resumen.emitidos`, el techo del eje es el mayor de lo que hay que dibujar, y sin base el porcentaje es «—» y no 0 % |
| El rango «Todo» arrancaba en el centinela 2000-01-01: 321 meses, 311 vacíos, 927 avisos de React por claves repetidas y la información real comprimida en el último 3 % del ancho | La serie arranca en el primer mes con actividad, y en una base vacía no arranca |
| Toda la pantalla de estadísticas estaba detrás de `resumen.emitidos > 0`: si fallaba ESA lectura, las otras nueve no se dibujaban, con el banner diciendo «lo que se ve es lo que sí llegó» sobre una pantalla vacía | El portón mira todas las lecturas, y «A quién llamar hoy» queda afuera porque no depende de la ventana |
| Una lectura caída se mostraba como una afirmación tranquilizadora: «No hay ningún presupuesto esperando respuesta», «Todavía no se perdió ninguno. Buena noticia» | El fallo se propaga por bloque: el que no volvió lo dice |
| La grilla del gráfico de líneas se repartía sobre el contenedor, que además abraza la fila de meses: la línea que se lee como el cero caía 25px por debajo del cero real | La grilla va dentro del área de dibujo |
| En el celular el tooltip de los gráficos se abría y se cerraba en el mismo toque —la secuencia de compatibilidad del navegador dispara `mouseleave` después del `focus`—, y como el gráfico de líneas no imprime los números, los valores mensuales no se podían leer con el dedo | `onPointerLeave` filtrado por mouse y `onPointerDown` para fijar el punto |
| El ticket promedio de un mes sin presupuestos se informaba como $ 0 y hundía la línea al piso del eje, como si el consultorio hubiera regalado el trabajo | `null` es un hueco y el trazo se corta ahí |
| La baja de un profesional desde Biblioteca no cortaba el acceso ni exigía ser admin, así que `/equipo` mostraba «De baja» a alguien que seguía entrando | `activo` sale del formulario de Biblioteca: una columna, un significado, un solo camino (`cambiarActivo`) |
| El back del navegador no volvía al rango anterior de estadísticas —`router.replace` pisaba el historial— aunque el comentario del componente prometía lo contrario | `router.push` |
| «Presupuestos por paciente» redondeaba 1,33 a «1» —justo el valor que significa «nadie volvió»— al lado de «Volvieron 33 %» | Se muestra con sus decimales |
| La home se cortaba en 200 filas y la única salida ofrecida era «achicá el rango de fechas»: con 500 presupuestos, a los 300 más viejos no se llegaba nunca | Paginado por URL (`?p=`, 50 por página) con el total exacto: el back del navegador vuelve y el link se comparte |
| Un `?p=` fuera de rango —un link viejo, o un filtro que achicó el resultado— dejaba la pantalla en «ningún presupuesto con esos filtros» | `.range()` viaja como `offset`/`limit` y vuelve vacío, no con error: con el conteo real se cae a la última página que existe |
| Un rango de fechas dado vuelta (`?desde=` posterior a `?hasta=`) devolvía cero y se leía como «no hay» | `parseFiltros` lo endereza |
| Con la lectura caída los KPIs decían «todavía no cargaste nada»: `falla` colapsaba en `vacío` y las cuatro tarjetas mostraban la misma raya | Tres estados distintos (`ok`, `vacío`, `falla`), cada raya con su explicación en `sr-only` |
| Tocar un filtro con la búsqueda a medio escribir perdía lo tipeado y disparaba dos navegaciones | El cambio de filtro arrastra lo tipeado y cancela el debounce en vuelo |
| Encadenar dos filtros perdía el primero: cada elección se armaba sobre lo que había contestado el servidor, que durante la navegación está atrasado. Tocar dos chips de estado seguidos en el celular dejaba sólo el segundo, y tipear después de elegir un filtro lo borraba | La barra guarda lo que ya pidió y arma la próxima URL sobre eso; además el control se prende al tocarlo y no al volver el servidor |
| Desde el celular no había forma de filtrar por obra social, profesional ni fecha, y un link con `?prof=` traía filtros invisibles e imposibles de sacar | Sheet de filtros con contador, que se cierra solo si la ventana pasa a desktop |
| Un click en la fila navegaba aunque se estuviera seleccionando texto (leer un DNI y marcarlo abría el detalle) o viniera con Cmd/Ctrl | El click se guarda contra selección, modificadores y descendientes interactivos |
| El esqueleto de la home no coincidía con la home: al llegar los datos saltaba todo | `app/(app)/loading.tsx` calca ritmo, KPIs, barra y listado |
| Todas las horas del servidor salían en UTC: Vercel corre así y el timeline, la cabecera y el reloj de días se renderizan en el servidor. Un WhatsApp de las 11:32 figuraba «14:32», entre las 21:00 y la medianoche lo de hoy aparecía como «Ayer», los días sin respuesta sumaban uno de más, y el mismo texto se re-renderizaba distinto en el cliente (mismatch de hidratación) | `lib/formato.ts` lleva todo instante a `America/Argentina/Buenos_Aires` con `Intl` —sin dependencias nuevas— y respeta los `YYYY-MM-DD` pelados, que son días del calendario y no instantes. `isoDate()` sin argumento es «hoy en el consultorio»: en el servidor fechaba mañana a partir de las 21:00 |
| `repartirCuotas` dividía antes de multiplicar: la misma desviación de punto flotante ya arreglada en `calcularItem` y `montoConAumento`. Con «70 % al iniciar» —un plan de lo más común— cualquier total a cargo que cayera en `.5` divergía un peso: el preview del paso 3 prometía $ 89.883 y el documento emitido decía $ 89.884 | Se multiplica primero, en centésimas enteras, igual que los otros dos. Verificado por barrido contra la cuenta exacta de `crear_presupuesto` |
| `cuotasSuman100` comparaba la suma flotante contra 100 con tolerancia 0,01: `33,33 × 3` da `99.99000000000001` y el wizard bloqueaba «Guardar» por un reparto en tercios que la base sí acepta | La cuenta va en centésimas enteras, con el mismo margen que `crear_presupuesto` |
| El caché del PDF se medía contra `presupuestos.updated_at`, que se mueve por cosas que no salen en el documento: cada cambio de estado, cada nota interna y cada teléfono cargado forzaban un render de segundos y dejaban otra línea «Se generó el PDF» en un historial que es append-only y no se puede limpiar | Se decide por la regla del producto: emitido = congelado, así que el objeto del bucket **es** el documento. Se regenera sólo si todavía es borrador o si el archivo no está |
| La route del PDF traía presupuesto + ítems + cuotas y hacía un `list()` de Storage incluso cuando iba a redirigir al archivo ya cacheado: cinco viajes de red para servir un objeto que existía | Cabecera sola para decidir, ítems y cuotas sólo si hay que renderizar, y la firma reemplaza al `list()` (firmar valida que el objeto esté). Sesión y documento se piden en paralelo, y el evento del historial va con `after()` |
| Sin sesión, `/api/presupuestos/[id]/pdf` recibía el redirect al login: un 200 con HTML. El sheet de WhatsApp hacía `res.blob()` y adjuntaba la pantalla de acceso como si fuera el presupuesto del paciente | Las rutas `/api/*` contestan 401 JSON; el redirect es sólo para las pantallas |
| Un bache de red en `auth.getUser()` —que corre en **cada** request— se leía igual que «no hay sesión» y echaba a la recepción al login en medio de un presupuesto | El proxy distingue «no pudo confirmar» de «no hay»: con las cookies de sesión presentes deja pasar (el JWT lo valida PostgREST por firma) y `getUsuario()` reintenta una vez si el error es de transporte |
| El redirect al login perdía el query string: entrar desde `/presupuestos/x?whatsapp=1` dejaba al usuario en el detalle, sin el envío abierto | `desde` viaja con sus parámetros |
| `createClient()` del navegador levantaba una instancia nueva por llamada: el wizard, el drawer del histórico y el sheet de WhatsApp tenían un `GoTrueClient` cada uno, pisándose al renovar el token | Un cliente memoizado por pestaña |
| Un `staleTime` único de 30 s trataba igual al catálogo de prestaciones y al estado de un presupuesto: abrir el wizard después de un rato volvía a bajar pacientes, profesionales, obras sociales y prestaciones enteros, con el paciente enfrente | Defaults por tipo de dato (`setQueryDefaults`), `gcTime` largo para los catálogos —que se invalidan a mano al dar de alta— y reintento con backoff que **no** reintenta errores de sesión ni de permiso |
| Sin `manifest` ni `apple-touch-icon`, «Agregar a inicio» en el celular dejaba un marcador de Safari con barra de direcciones e ícono genérico | `app/manifest.ts` (standalone, con dos accesos directos), `app/icon.svg` y `app/apple-icon.png` |
| iOS convertía en links los números del presupuesto —el número de documento, el DNI, el afiliado— y tocarlos abría el teléfono | `formatDetection` apagado en la metadata |
| En mobile el toast salía a 16 px del borde, debajo de la tabbar: el «Deshacer» del kanban quedaba tapado por el FAB, justo el atajo para arreglar un arrastre equivocado | `mobileOffset` por arriba de la barra, respetando el safe-area |
| Sin número, `rutaPdf()` devolvía la misma clave para todos: el PDF de un presupuesto se podía servir como el de otro | Cae al `id` antes que a un nombre compartido |
| **Una respuesta perdida emitía el presupuesto dos veces.** La RPC commitea y después viaja la respuesta; si el enlace se cortaba en el medio, la server action caía en su `catch` y el wizard decía «no se emitió nada» —falso— y ofrecía «Reintentar». El consultorio terminaba con 2026-0341 y 2026-0342 idénticos por el mismo tratamiento, sin saber cuál mandó | El alta la identifica el cliente: el wizard genera una `clave_alta`, la guarda en el borrador (sobrevive la recarga) y viaja con el payload. Si esa clave ya emitió, la RPC devuelve ese documento. Verificado también con dos pedidos simultáneos: el que pierde la carrera deshace su inserción y devuelve el del otro (migración 20) |
| Una lectura de arancel que **fallaba** al cambiar de obra social se contaba igual que «no hay arancel para esta obra social»: el ítem se devolvía intacto, con la cobertura de la obra social anterior, y el cartel explicaba con seguridad algo que nunca se comprobó. El documento salía con «OSDE 210» en la cabecera y Swiss Medical en las líneas | Las lecturas caídas se cuentan aparte y no se aplica nada: se deja la obra social anterior, que es la que sí concuerda con lo cotizado, y se pide reintentar |
| El Enter de los mini-formularios del wizard no pasaba por el botón, así que el `isPending` que lo deshabilita no lo frenaba: dos Enter creaban dos pacientes «Gómez, Renata» en la agenda, o dos prestaciones con el mismo código | `useGuardadoUnico`, con `ref`: se cierra en el mismo tick, un render antes de que `isPending` exista |
| En mobile —donde se carga la mayoría de los presupuestos— la X del wizard llamaba a `cerrar` derecho, salteándose la guarda que sí tenían el Escape y el clic afuera: se podía cerrar el wizard con la RPC en vuelo y quedarse sin ninguna pantalla que contara cómo terminó | La X se deshabilita mientras se emite |
| Los errores que ninguna traducción supo nombrar se mostraban crudos: «new row for relation "presupuesto_items" violates check constraint …» en el banner del wizard y en la biblioteca | `lib/errores.ts` decide qué es texto para leer y qué es jerga; el crudo queda en el log del servidor |
| Los mensajes de zod sin texto propio salían en inglés («Too big: expected string to have <=200 characters») | Locale de zod en castellano como red de abajo, y mensaje escrito a mano en cada regla alcanzable desde la pantalla |
| Duplicar no distinguía «no se pudo» de «no sé»: una caída de red después del commit se reportaba como fallo y quien reintentaba se llevaba dos duplicados | Ahí el mensaje no promete: pide refrescar el listado antes de repetir. En `cambiar_estado` sí se puede invitar a repetir, porque la RPC sale sola si el estado ya es el pedido |
| **El wizard se congelaba para siempre si se cortaba la conexión.** El `try/catch` de la server action cubre la pata servidor → Supabase; la otra —navegador → servidor, que es la que se cae cuando se corta el wifi del consultorio— no la cubría nadie: la promesa se rechazaba, `guardar()` salía por arriba y dejaba `guardando` puesto. Spinner eterno, todos los botones deshabilitados, y ninguna forma de reintentar ni de salir sin recargar, con el presupuesto entero cargado | `try/catch` alrededor de la llamada, con un mensaje que dice qué pasó y deja «Reintentar» a mano |
| **El PDF salía con la tabla de prestaciones VACÍA y el total a cargo entero** si fallaba la lectura de los ítems: `cargarDocumentoPdf` desestructuraba sólo `data` y el `?? []` convertía «no pude leer» en «no tiene prestaciones». Los totales vienen de la cabecera, que sí llegó. Y ese PDF se subía al bucket y quedaba cacheado COMO el documento: la próxima visita ni lo reintentaba | Un error en la lectura de ítems o de cuotas corta el render (502). Cero ítems en un emitido también: es un estado que las guardas no permiten, así que si llega, algo se rompió |
| **«Histórico completo» ponía el badge «Vigente» sobre el aumento todavía no arrancado** y apagaba el precio que sí rige hoy: decidía con `vigente_hasta === null`, que es la semántica anterior a los aumentos programados. Verificado: la fila de $ 792.000 «desde 01/03/2027» salía como vigente mientras el wizard cotizaba los $ 720.000 de la otra | `estadoVigencia()` decide por fecha, con la misma definición que `arancel_vigente()` en SQL, y hay tres estados: Vigente, Programada y cerrada |
| **Un arancel sin usar se podía reescribir en el lugar** —monto, cobertura y fechas— desde cualquier sesión del equipo: `guard_arancel_inmutable` sólo miraba `if exists (…presupuesto_items…)`, o sea la regla 2 y no la 1. Moviéndole `vigente_desde` quedaban DOS aranceles rigiendo el mismo día para la misma celda, que el índice `aranceles_una_vigente` no agarra porque cubre sólo la abierta | Ninguna columna se edita desde una sesión del equipo, usada o no; las escrituras legítimas entran por las RPC. Y un trigger nuevo prohíbe que dos vigencias se pisen (migración 21) |
| El aumento masivo aceptaba una fecha «rige desde» en el pasado sin decir nada, y podía cerrar hacia atrás una vigencia ya citada por un presupuesto emitido: el documento quedaba citando un precio que, según la base, ya no regía el día en que se emitió | La fecha pasada sigue permitida —puede ser legítima— pero avisa en el modal, y la base rechaza el caso que rompe un documento |
| **El timeline agrupaba por día en UTC**: `getDate()` sobre un proceso que en Vercel corre en UTC. Un evento de las 23:30 caía bajo el día siguiente mientras su propio tooltip decía el día correcto —la misma tarjeta se contradecía—, y cuando el grupo mal armado era el de hoy salían dos encabezados «Hoy» seguidos | `diaCalendario()` en `lib/formato.ts`: la clave del grupo sale de la misma hora argentina que la etiqueta |
| El WhatsApp le decía «ya con la cobertura descontada» a un paciente particular, que no tiene ninguna cobertura: el monto que estaba leyendo era el precio de lista completo. El PDF y el detalle sí lo distinguen, así que el criterio ya existía en el producto | El mensaje mira `total_cobertura` y dice «que es el total del tratamiento» cuando no hubo cobertura |
| En mobile la card de cada prestación se comía la `descripcion`, que está en el snapshot, en la tabla de escritorio y en el PDF. No es decoración: es lo que define el alcance de lo presupuestado («incluye provisorio y cementado») | Se imprime también en la card |
| El histórico no buscaba por código —la grilla sí— aunque la búsqueda cruza de vista por la URL, y el vacío culpaba a un truncado que no existía: mandaba a buscar un problema de paginado con 32 vigencias de un tope de 300 | Se busca por prestación, código, rubro y obra social, y el texto del vacío sólo habla del tope cuando lo hay |

### Pendiente

- [ ] Tests de componentes y de integración (hoy la suite cubre el núcleo de
      cálculo, formato y estados, no la UI).
- [ ] Extender `npm run test:paridad` al reparto de cuotas: hoy barre
      `calcularItem` contra `calcular_cobertura()`, pero `repartirCuotas` vs
      `crear_presupuesto()` se verificó a mano. Es la misma clase de bug (un
      peso de diferencia entre el preview y el documento) y merece el mismo
      barrido automático.
- [ ] El timeline saca el año con `new Date(iso).getFullYear()`, que sigue
      leyendo en UTC. Sólo se nota entre el 31/12 21:00 y la medianoche;
      `anio()` de `lib/formato.ts` ya devuelve el año del consultorio.
- [ ] Reporte de pérdidas por motivo y período (hoy sólo la franja del kanban).
- [ ] El paso 1 del wizard todavía no lee el `?q=` de la home: «Crear paciente
      «X»» abre el wizard en blanco y hay que retipear el nombre que se acaba
      de buscar.
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
- `npm test` — 59 casos sobre `lib/calculo.ts`, `lib/formato.ts`, `lib/estados.ts`,
  `lib/estadisticas.ts` y `lib/zod.ts`.
- `npm run sql:instalar` — regenera los scripts del SQL Editor desde las
  migraciones. Correr después de tocar cualquier migración.
- `npm run test:paridad` — 220 casos comparando `calcularItem` contra
  `calcular_cobertura()` en una base real. **Es el que hay que correr después
  de tocar cualquiera de los dos.**
- **Regla de redondeo, en los tres lugares donde hay que respetarla**:
  `calcularItem`, `montoConAumento` y `repartirCuotas` multiplican ANTES de
  dividir y trabajan en centésimas enteras, porque así es exacto el `numeric`
  de Postgres. Dividir primero desvía medio peso justo en los casos que caen
  en `.5`, y ahí el preview promete un número y el documento emitido dice
  otro. Cualquier cuenta nueva que espeje SQL va igual.
- Las guardas de la regla del snapshot se probaron contra un Postgres real
  aplicando las migraciones desde cero: cada regla se intentó violar y tiene
  que fallar (ítems de un emitido, arancel usado, borrado de aranceles,
  edición del historial, vuelta a borrador, reapuntado de un arancel, mudanza
  de un ítem a otro presupuesto, reapuntado de `clave_alta` en un emitido,
  reescritura en el lugar de un arancel todavía sin usar, dos vigencias
  pisándose para la misma celda, y cerrar una vigencia antes del presupuesto
  emitido que la cita).
- **La idempotencia del alta se prueba con dos pedidos simultáneos**, no con
  dos seguidos: dos transacciones con la misma `clave_alta` tienen que dejar
  UN documento y devolverle el mismo id a las dos.
- **QA con navegador, en mobile (390×844) y desktop (1440×900).** Se abre la
  app real —no un mock— contra un Postgres local con el seed, se entra con
  usuario y contraseña, se recorre cada pantalla y se carga un presupuesto
  entero clic por clic hasta verlo en `presupuesto_items`. Además de mirar las
  capturas, cada pantalla se audita en vivo: scroll horizontal del `body`,
  elementos que se salen del viewport, objetivos táctiles por debajo de 40px,
  contenido tapado por las barras fijas, texto cortado sin puntos suspensivos
  y errores de consola. Lo que se ve mal —etiquetas que se pisan, algo
  descentrado, una columna que parece cortada— no lo levanta ninguna de esas
  reglas: eso se mira.

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
