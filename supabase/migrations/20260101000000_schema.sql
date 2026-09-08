-- ════════════════════════════════════════════════════════════════════
-- Smile Lab · Presupuestos — 01 · Esquema base
--
-- REGLA QUE GOBIERNA TODO EL PRODUCTO
-- El presupuesto emitido es un DOCUMENTO, no una consulta a la base.
-- Al guardar se COPIAN dentro de presupuesto_items el nombre de la
-- prestación, su descripción, el monto, el tipo y valor de cobertura y
-- la diferencia calculada. Nunca se resuelven precios por join.
-- ════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- Entidades base
-- ─────────────────────────────────────────────────────────────

create table profesionales (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete set null, -- null = profesional sin login
  nombre        text not null,
  matricula     text,
  especialidad  text,
  activo        boolean not null default true,
  created_at    timestamptz not null default now()
);
create unique index profesionales_user_id_key on profesionales (user_id) where user_id is not null;

create table obras_sociales (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null,
  plan          text,                       -- "210", "310", null
  activa        boolean not null default true,
  notas         text,
  created_at    timestamptz not null default now(),
  unique (nombre, plan)
);

create table pacientes (
  id                uuid primary key default gen_random_uuid(),
  nombre            text not null,          -- "Apellido, Nombre" o libre
  dni               text,
  telefono          text,
  tiene_whatsapp    boolean not null default true,
  email             text,
  obra_social_id    uuid references obras_sociales(id) on delete set null,
  nro_afiliado      text,
  notas_internas    text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index pacientes_nombre_fts on pacientes using gin (to_tsvector('spanish', nombre));
create index pacientes_dni_idx on pacientes (dni);

create table prestaciones (
  id                uuid primary key default gen_random_uuid(),
  nombre            text not null,
  codigo            text unique,
  rubro             text,                   -- Endodoncia, Prótesis, Operatoria, Diagnóstico...
  descripcion       text,                   -- plantilla que se copia al presupuesto
  vigencia_dias     int not null default 30,
  activa            boolean not null default true,
  created_at        timestamptz not null default now()
);
create index prestaciones_nombre_fts on prestaciones using gin (to_tsvector('spanish', nombre));
create index prestaciones_rubro_idx on prestaciones (rubro);

-- Plantilla de condiciones de pago por prestación (opcional)
create table prestacion_cuotas (
  id                uuid primary key default gen_random_uuid(),
  prestacion_id     uuid not null references prestaciones(id) on delete cascade,
  orden             int not null,
  porcentaje        numeric(5,2) not null,  -- suma debe dar 100
  etiqueta          text not null           -- "al iniciar", "última sesión"
);
create index prestacion_cuotas_prestacion_idx on prestacion_cuotas (prestacion_id, orden);

-- ─────────────────────────────────────────────────────────────
-- Aranceles: append-only, con vigencias
-- ─────────────────────────────────────────────────────────────

create type tipo_cobertura as enum ('porcentaje', 'monto', 'ninguna');

create table aranceles (
  id                uuid primary key default gen_random_uuid(),
  prestacion_id     uuid not null references prestaciones(id) on delete restrict,
  obra_social_id    uuid references obras_sociales(id) on delete restrict, -- null = valor particular
  monto             numeric(12,2) not null check (monto >= 0),
  cobertura_tipo    tipo_cobertura not null default 'ninguna',
  cobertura_valor   numeric(12,2) not null default 0,   -- % (0-100) o monto fijo
  vigente_desde     date not null,
  vigente_hasta     date,                                -- null = vigente
  created_at        timestamptz not null default now(),
  created_by        uuid references auth.users(id),
  check (vigente_hasta is null or vigente_hasta >= vigente_desde),
  check (cobertura_valor >= 0),
  check (cobertura_tipo <> 'porcentaje' or cobertura_valor <= 100)
);

-- Una sola vigencia abierta por (prestación, obra social).
-- El coalesce colapsa el null de "Particular" a un uuid sentinela para
-- que el índice único también lo cubra.
create unique index aranceles_una_vigente
  on aranceles (prestacion_id, (coalesce(obra_social_id, '00000000-0000-0000-0000-000000000000'::uuid)))
  where vigente_hasta is null;

create index aranceles_lookup_idx on aranceles (prestacion_id, obra_social_id, vigente_desde desc);

-- ─────────────────────────────────────────────────────────────
-- Presupuestos
-- ─────────────────────────────────────────────────────────────

create type estado_presupuesto as enum (
  'borrador','realizado','enviado','pendiente','interesado','aceptado','iniciado','perdido'
);

create type motivo_perdida as enum (
  'precio','sin_respuesta','cobertura','otro_lugar','otro'
);

create table presupuestos (
  id                  uuid primary key default gen_random_uuid(),
  numero              text unique,          -- "2026-0341", generado por trigger
  paciente_id         uuid not null references pacientes(id) on delete restrict,
  profesional_id      uuid not null references profesionales(id) on delete restrict,

  -- snapshot de contexto (texto, no joins)
  obra_social_id      uuid references obras_sociales(id) on delete set null,
  obra_social_nombre  text,                 -- "OSDE 210" o null = Particular
  paciente_nombre     text not null,
  paciente_dni        text,
  paciente_telefono   text,
  paciente_afiliado   text,
  profesional_nombre  text not null,
  profesional_matricula text,

  fecha_emision       date not null default current_date,
  valido_hasta        date not null,

  -- totales congelados
  subtotal            numeric(12,2) not null default 0,
  total_cobertura     numeric(12,2) not null default 0,
  total_a_cargo       numeric(12,2) not null default 0,

  observaciones       text,
  estado              estado_presupuesto not null default 'borrador',
  estado_desde        timestamptz not null default now(),  -- días en el estado (pipeline)
  motivo_perdida      motivo_perdida,
  motivo_perdida_nota text,
  nota_interna        text,

  pdf_path            text,                 -- Storage: presupuestos/2026-0341.pdf
  duplicado_de        uuid references presupuestos(id) on delete set null,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  created_by          uuid references auth.users(id)
);
create index presupuestos_estado_fecha_idx on presupuestos (estado, fecha_emision desc);
create index presupuestos_paciente_idx on presupuestos (paciente_id);
create index presupuestos_profesional_idx on presupuestos (profesional_id);
create index presupuestos_obra_social_idx on presupuestos (obra_social_id);
create index presupuestos_numero_idx on presupuestos (numero);

create table presupuesto_items (
  id                    uuid primary key default gen_random_uuid(),
  presupuesto_id        uuid not null references presupuestos(id) on delete cascade,
  orden                 int not null default 0,

  -- referencias sólo para trazabilidad, NUNCA para mostrar precios
  prestacion_id         uuid references prestaciones(id) on delete set null,
  arancel_id            uuid references aranceles(id) on delete set null,

  -- SNAPSHOT
  nombre                text not null,
  codigo                text,
  descripcion           text,
  detalle               text,               -- "pieza 36, cara oclusal"
  monto                 numeric(12,2) not null,
  cobertura_tipo        tipo_cobertura not null,
  cobertura_valor       numeric(12,2) not null default 0,
  cobertura_monto       numeric(12,2) not null,   -- resuelto en pesos
  a_cargo               numeric(12,2) not null,   -- monto - cobertura_monto

  -- override respecto del arancel
  editado                  boolean not null default false,
  cobertura_original_tipo  tipo_cobertura,
  cobertura_original_valor numeric(12,2),
  motivo_override          text
);
create index presupuesto_items_orden_idx on presupuesto_items (presupuesto_id, orden);
create index presupuesto_items_arancel_idx on presupuesto_items (arancel_id);
create index presupuesto_items_prestacion_idx on presupuesto_items (prestacion_id);

create table presupuesto_cuotas (
  id                uuid primary key default gen_random_uuid(),
  presupuesto_id    uuid not null references presupuestos(id) on delete cascade,
  orden             int not null,
  etiqueta          text not null,
  porcentaje        numeric(5,2),
  monto             numeric(12,2) not null
);
create index presupuesto_cuotas_orden_idx on presupuesto_cuotas (presupuesto_id, orden);

-- Historial: append-only, alimenta el timeline del detalle
create table presupuesto_eventos (
  id                uuid primary key default gen_random_uuid(),
  presupuesto_id    uuid not null references presupuestos(id) on delete cascade,
  tipo              text not null,   -- creado | item_editado | pdf_generado | enviado_whatsapp
                                     -- | estado_cambiado | nota | duplicado
  descripcion       text not null,   -- texto ya legible: "de 60% a monto fijo $ 56.600"
  estado_anterior   estado_presupuesto,
  estado_nuevo      estado_presupuesto,
  autor_id          uuid references auth.users(id),
  autor_nombre      text not null,
  created_at        timestamptz not null default now()
);
create index presupuesto_eventos_timeline_idx on presupuesto_eventos (presupuesto_id, created_at desc);

-- ─────────────────────────────────────────────────────────────
-- updated_at
-- ─────────────────────────────────────────────────────────────

create or replace function touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger trg_pacientes_updated
  before update on pacientes
  for each row execute function touch_updated_at();

create trigger trg_presupuestos_updated
  before update on presupuestos
  for each row execute function touch_updated_at();
