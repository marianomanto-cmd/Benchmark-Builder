# Smile Lab · Presupuestos

Aplicación interna del consultorio para cargar presupuestos odontológicos,
calcular lo que queda a cargo del paciente según su obra social, y seguir la
respuesta comercial hasta que el tratamiento se inicia o se pierde.

**Stack:** Next.js 16 (App Router) · Supabase (Postgres, Auth, Storage) · Vercel.

---

## La regla que gobierna todo el producto

**El presupuesto emitido es un documento, no una consulta a la base.**

Al guardar un presupuesto se **copian** dentro de `presupuesto_items` el nombre
de la prestación, su descripción, el monto, el tipo y valor de cobertura y la
diferencia calculada. No se guardan referencias que después se resuelvan por
join para mostrar precios.

1. `aranceles` es **append-only**. Un cambio de precio inserta una fila nueva y
   cierra la anterior. Nunca un `UPDATE` de monto o cobertura.
2. Un arancel ya usado en un presupuesto **no se puede editar** (bloqueado en la
   UI y por trigger).
3. Si el arancel vigente hoy difiere del snapshot, el detalle muestra un banner
   informativo. La única acción ofrecida es **duplicar**.
4. Los overrides de cobertura viven en el ítem del presupuesto, nunca escriben
   en `aranceles`.

Si algo de esto se relaja, el consultorio pierde la capacidad de defender un
presupuesto viejo frente a un paciente. Es el requisito no funcional más
importante del sistema.

---

## Arranque local

```bash
npm install
cp .env.example .env.local     # completá las claves de Supabase
npm run dev
```

### Base de datos

Con la [Supabase CLI](https://supabase.com/docs/guides/local-development):

```bash
supabase start                 # Postgres + Auth + Storage + Studio
supabase db reset              # aplica migrations/ y seed.sql
```

**Sin la CLI**, pegando en el SQL Editor de Supabase: corré
`supabase/instalar.sql`, después `supabase/instalar-storage.sql` y, si querés
datos de arranque, `supabase/seed.sql`. Los dos primeros se generan desde las
migraciones con `npm run sql:instalar`.

Contra un proyecto remoto:

```bash
supabase link --project-ref <ref>
supabase db push
psql "$DATABASE_URL" -f supabase/seed.sql
```

### Configuración de Supabase Auth

- Habilitar el proveedor **Email** con contraseña.
- **Apagar «Confirm email»**: las altas las hace un admin desde la app y el
  usuario tiene que poder entrar en el momento.
- **Deshabilitar signups abiertos.**

La primera vez que se abre `/login` se crea el administrador **`admin` /
`smilelab`** si el consultorio no tiene ninguno. Cambiá esa contraseña apenas
entres, desde *Mi contraseña*.

### Storage

Bucket **privado** `presupuestos`, acceso por signed URL de 7 días. Lo crea la
migración `…_storage.sql`.

---

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo (Turbopack) |
| `npm run build` | Build de producción |
| `npm run start` | Sirve el build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Tests del núcleo de cálculo, formato y estados |
| `npm run test:paridad` | Verifica que `lib/calculo.ts` y `calcular_cobertura()` den el mismo número (necesita `DATABASE_URL`) |
| `npm run sql:instalar` | Regenera los scripts del SQL Editor desde `supabase/migrations/` |

---

## Estructura

```
app/
  (auth)/login/            Pantalla 01 · usuario + contraseña
  (app)/layout.tsx         Shell: topbar desktop / tabbar+FAB mobile
  (app)/page.tsx           Pantallas 02-03 · Home (con datos / vacía)
  (app)/pipeline/          Pantalla 12 · Kanban (desktop)
  (app)/presupuestos/[id]/ Pantalla 11 · Detalle
  (app)/biblioteca/        Pantalla 09 · tabs de entidades
  (app)/biblioteca/aranceles/  Pantalla 10 · grilla + drawer de vigencias
  (app)/equipo/            Equipo y accesos (admin) · Mi contraseña
  api/presupuestos/[id]/pdf/   Pantalla 13 · @react-pdf/renderer
  api/cron/pendientes/     enviado → pendiente a los 7 días
  actions/                 Server Actions
components/
  wizard/                  Pantallas 04-08 · pasos 1-2-3, comboboxes, mini-forms
  presupuesto/             Detalle y pantalla 14 · sheet de WhatsApp
  home/ biblioteca/ pipeline/ shell/
  ui/                      Button, Pill, EstadoBadge, Field, Combobox, Sheet, Drawer…
tests/                     Núcleo de cálculo, formato y estados
scripts/paridad-sql.mjs    Paridad entre lib/calculo.ts y calcular_cobertura()
lib/
  calculo.ts               cobertura y a-cargo — única fuente de verdad
  formato.ts               moneda, fechas y números es-AR
  estados.ts               máquina de estados y paleta de badges
  supabase/                clientes de browser, server y admin
  pdf/                     documento A4
supabase/migrations/       Esquema, guardas, RPC, RLS y Storage
docs/STATUS.md             Estado del proyecto — fuente de verdad
```

---

## Documentación

- **[`docs/STATUS.md`](docs/STATUS.md)** — estado del proyecto: modelo de datos,
  pipeline, pantallas, variables de entorno y qué está hecho vs pendiente.
- **[`AGENTS.md`](AGENTS.md)** — reglas para quien (o lo que) escriba código acá.
