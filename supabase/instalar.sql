-- ════════════════════════════════════════════════════════════════════
--  SMILE LAB · PRESUPUESTOS — INSTALACIÓN  ·  PARTE 1 de 3
--  Esquema, guardas, RPC, vistas y RLS.
--
--  CÓMO: Supabase → SQL Editor → New query → pegar TODO → Run.
--  Corre entero o no corre: si algo falla, no queda nada a medias.
--
--  NO editar acá. Se genera desde `supabase/migrations/` con
--  `npm run sql:instalar`. La fuente de verdad son las migraciones.
--
--  ¿Ya lo corriste y querés empezar de cero? Descomentá el bloque de
--  abajo (BORRA TODOS LOS DATOS) y corré el script otra vez.
-- ════════════════════════════════════════════════════════════════════

-- ─── RESET · descomentar sólo para reinstalar desde cero ────────────
-- drop view if exists aranceles_usos, aranceles_programados,
--                     aranceles_vigentes, presupuestos_listado cascade;
-- drop table if exists presupuesto_eventos, presupuesto_cuotas,
--                      presupuesto_items, presupuestos, aranceles,
--                      prestacion_cuotas, prestaciones, pacientes,
--                      obras_sociales, profesionales cascade;
-- drop type if exists estado_presupuesto, motivo_perdida, tipo_cobertura cascade;
-- drop sequence if exists presupuesto_seq cascade;
-- drop function if exists calcular_cobertura, actor_nombre, nueva_vigencia,
--                         aumento_masivo, crear_presupuesto, duplicar_presupuesto,
--                         cambiar_estado, registrar_evento, marcar_pendientes,
--                         arancel_vigente, touch_updated_at, touch_estado_desde,
--                         set_presupuesto_numero, guard_arancel_inmutable,
--                         guard_arancel_no_delete, guard_item_emitido,
--                         guard_evento_inmutable, guard_presupuesto_emitido cascade;
-- ────────────────────────────────────────────────────────────────────


-- ─── schema ───────────────────────────────────────


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


-- ─── guardas ───────────────────────────────────────


-- ─────────────────────────────────────────────────────────────
-- Numeración   "2026-0341"
-- ─────────────────────────────────────────────────────────────

create sequence presupuesto_seq;


create or replace function set_presupuesto_numero() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.numero is null then
    new.numero := to_char(now(), 'YYYY') || '-' ||
                  lpad(nextval('presupuesto_seq')::text, 4, '0');
  end if;
  return new;
end $$;


create trigger trg_presupuesto_numero
  before insert on presupuestos
  for each row execute function set_presupuesto_numero();

-- ─────────────────────────────────────────────────────────────
-- 1) Un arancel usado no se puede modificar
-- ─────────────────────────────────────────────────────────────


create or replace function guard_arancel_inmutable() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if exists (select 1 from presupuesto_items where arancel_id = old.id) then
    if new.monto is distinct from old.monto
       or new.cobertura_tipo is distinct from old.cobertura_tipo
       or new.cobertura_valor is distinct from old.cobertura_valor
       or new.vigente_desde is distinct from old.vigente_desde
       -- Reapuntar un arancel usado rompe la trazabilidad del
       -- presupuesto que lo cita: el `arancel_id` del ítem pasaría a
       -- señalar una prestación que nunca se presupuestó.
       or new.prestacion_id is distinct from old.prestacion_id
       or new.obra_social_id is distinct from old.obra_social_id
       or new.id is distinct from old.id
    then
      raise exception
        'Arancel % ya usado en presupuestos: cargá una vigencia nueva', old.id;
    end if;
  end if;
  return new;
end $$;


create trigger trg_arancel_inmutable
  before update on aranceles
  for each row execute function guard_arancel_inmutable();

-- Append-only de verdad: tampoco se borra.
-- (La ausencia de policy de DELETE ya lo bloquea para el rol authenticated;
--  este trigger cubre además al service_role y a psql.)

create or replace function guard_arancel_no_delete() returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'Los aranceles son append-only: cerrá la vigencia en lugar de borrar';
end $$;


create trigger trg_arancel_no_delete
  before delete on aranceles
  for each row execute function guard_arancel_no_delete();

-- ─────────────────────────────────────────────────────────────
-- 2) Los ítems de un presupuesto emitido no se editan
--
-- Nota de implementación: por esta guarda, el alta de un presupuesto
-- SIEMPRE inserta la cabecera en 'borrador', luego los ítems, y recién
-- entonces promueve el estado. Ver crear_presupuesto().
-- ─────────────────────────────────────────────────────────────


create or replace function guard_item_emitido() returns trigger
language plpgsql
set search_path = public
as $$
declare est estado_presupuesto;
begin
  select estado into est from presupuestos
   where id = coalesce(new.presupuesto_id, old.presupuesto_id);

  -- Si el presupuesto ya no existe (cascade de delete) dejamos pasar.
  if est is null then
    return coalesce(new, old);
  end if;

  if est <> 'borrador' then
    raise exception 'Presupuesto ya emitido: duplicalo en lugar de editarlo';
  end if;
  return coalesce(new, old);
end $$;


create trigger trg_item_emitido
  before insert or update or delete on presupuesto_items
  for each row execute function guard_item_emitido();

-- Misma regla para las cuotas: son parte del documento.
create trigger trg_cuota_emitida
  before insert or update or delete on presupuesto_cuotas
  for each row execute function guard_item_emitido();

-- ─────────────────────────────────────────────────────────────
-- 3) El historial no se borra ni se edita
-- ─────────────────────────────────────────────────────────────


create or replace function guard_evento_inmutable() returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'El historial del presupuesto es append-only';
end $$;


create trigger trg_evento_inmutable
  before update or delete on presupuesto_eventos
  for each row execute function guard_evento_inmutable();

-- ─────────────────────────────────────────────────────────────
-- 4) estado_desde: reloj de "días en el estado" del pipeline
-- ─────────────────────────────────────────────────────────────


create or replace function touch_estado_desde() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.estado is distinct from old.estado
     -- Única excepción: pasar de enviado a pendiente es la continuación
     -- de la misma espera, no un estado nuevo. Vale tanto para el cron
     -- como para el cambio a mano desde el detalle.
     and not (old.estado = 'enviado' and new.estado = 'pendiente')
  then
    new.estado_desde := now();
  end if;
  return new;
end $$;


create trigger trg_presupuesto_estado_desde
  before update on presupuestos
  for each row execute function touch_estado_desde();


-- ─── rpc vistas ───────────────────────────────────────


-- ─────────────────────────────────────────────────────────────
-- Cálculo del ítem — espejo exacto de lib/calculo.ts
--
--   porcentaje → round(monto * valor / 100)
--   monto      → min(valor, monto)
--   ninguna    → 0
--
-- Redondeo al peso, sin decimales. Si cambia una, cambia la otra:
-- son la única fuente de verdad y tienen que dar el mismo número.
-- ─────────────────────────────────────────────────────────────


create or replace function calcular_cobertura(
  p_monto numeric,
  p_tipo  tipo_cobertura,
  p_valor numeric
) returns numeric
language sql immutable
as $$
  -- El least/greatest acota la cobertura a [0, monto]: un override a
  -- mano puede tipear 150 % o un monto fijo mayor al arancel, y sin el
  -- tope el a-cargo saldría negativo.
  select greatest(0::numeric, least(
    case p_tipo
      when 'porcentaje' then round(p_monto * coalesce(p_valor, 0) / 100)
      when 'monto'      then coalesce(p_valor, 0)
      else 0::numeric
    end,
    p_monto))
$$;


-- ─────────────────────────────────────────────────────────────
-- Autor de los eventos: nombre legible del usuario logueado.
-- ─────────────────────────────────────────────────────────────


create or replace function actor_nombre() returns text
language sql stable
set search_path = public
as $$
  select coalesce(
    (select p.nombre from profesionales p where p.user_id = auth.uid() limit 1),
    nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'email', ''),
    'Sistema'
  )
$$;


-- ─────────────────────────────────────────────────────────────
-- Nueva vigencia de arancel (una transacción)
-- Cierra la vigencia abierta e inserta la nueva. Nunca un UPDATE de monto.
-- ─────────────────────────────────────────────────────────────


create or replace function nueva_vigencia(
  p_prestacion    uuid,
  p_obra_social   uuid,
  p_monto         numeric,
  p_cob_tipo      tipo_cobertura,
  p_cob_valor     numeric,
  p_desde         date
) returns uuid
language plpgsql security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  -- La vigencia nueva no puede empezar antes o el mismo día que la abierta:
  -- dejaría un rango cerrado inválido (vigente_hasta < vigente_desde).
  if exists (
    select 1 from aranceles
     where prestacion_id = p_prestacion
       and obra_social_id is not distinct from p_obra_social
       and vigente_hasta is null
       and vigente_desde >= p_desde
  ) then
    raise exception
      'La vigencia nueva tiene que arrancar después del % de la vigencia actual',
      (select vigente_desde from aranceles
        where prestacion_id = p_prestacion
          and obra_social_id is not distinct from p_obra_social
          and vigente_hasta is null);
  end if;

  update aranceles
     set vigente_hasta = p_desde - interval '1 day'
   where prestacion_id = p_prestacion
     and obra_social_id is not distinct from p_obra_social
     and vigente_hasta is null;

  insert into aranceles (prestacion_id, obra_social_id, monto,
                         cobertura_tipo, cobertura_valor, vigente_desde, created_by)
  values (p_prestacion, p_obra_social, p_monto,
          p_cob_tipo, p_cob_valor, p_desde, auth.uid())
  returning id into v_id;

  return v_id;
end $$;


-- ─────────────────────────────────────────────────────────────
-- Aumento masivo: una llamada a nueva_vigencia por fila, en una
-- transacción. El preview de filas afectadas se arma en el cliente
-- con aranceles_vigentes antes de confirmar.
-- ─────────────────────────────────────────────────────────────


create or replace function aumento_masivo(
  p_rubro        text,
  p_obra_social  uuid,
  p_solo_particular boolean,
  p_pct          numeric,
  p_desde        date
) returns int
language plpgsql security definer
set search_path = public
as $$
declare
  r record;
  n int := 0;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  for r in
    select a.prestacion_id, a.obra_social_id, a.monto, a.cobertura_tipo, a.cobertura_valor
      from aranceles a
      join prestaciones p on p.id = a.prestacion_id
     where a.vigente_hasta is null
       and a.vigente_desde < p_desde
       and (p_rubro is null or p.rubro = p_rubro)
       and (
         case
           when p_solo_particular then a.obra_social_id is null
           when p_obra_social is not null then a.obra_social_id = p_obra_social
           else true
         end
       )
  loop
    perform nueva_vigencia(
      r.prestacion_id,
      r.obra_social_id,
      round(r.monto * (100 + p_pct) / 100),
      r.cobertura_tipo,
      r.cobertura_valor,
      p_desde
    );
    n := n + 1;
  end loop;

  return n;
end $$;


-- ─────────────────────────────────────────────────────────────
-- Alta de presupuesto: congela el documento entero.
--
-- La cabecera entra SIEMPRE como 'borrador' porque guard_item_emitido
-- bloquea la inserción de ítems en un presupuesto ya emitido; el estado
-- pedido se aplica al final, cuando el documento ya está completo.
-- ─────────────────────────────────────────────────────────────


create or replace function crear_presupuesto(p_payload jsonb)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_id            uuid;
  v_numero        text;
  v_pac           pacientes%rowtype;
  v_prof          profesionales%rowtype;
  v_os_nombre     text;
  v_os_id         uuid;
  v_estado        estado_presupuesto;
  v_item          jsonb;
  v_cuota         jsonb;
  v_orden         int := 0;
  v_monto         numeric;
  v_tipo          tipo_cobertura;
  v_valor         numeric;
  v_cob           numeric;
  v_subtotal      numeric := 0;
  v_total_cob     numeric := 0;
  v_total_cargo   numeric := 0;
  v_acum          numeric := 0;
  v_cuotas_n      int;
  v_cuotas_creadas int := 0;
  v_cuota_monto   numeric;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  v_estado := coalesce((p_payload ->> 'estado')::estado_presupuesto, 'realizado');
  if v_estado not in ('borrador','realizado','enviado') then
    raise exception 'Estado inicial inválido: %', v_estado;
  end if;

  if jsonb_array_length(coalesce(p_payload -> 'items', '[]'::jsonb)) = 0 then
    raise exception 'Un presupuesto necesita al menos una prestación';
  end if;

  select * into v_pac from pacientes where id = (p_payload ->> 'paciente_id')::uuid;
  if not found then raise exception 'Paciente inexistente'; end if;

  select * into v_prof from profesionales where id = (p_payload ->> 'profesional_id')::uuid;
  if not found then raise exception 'Profesional inexistente'; end if;

  -- La obra social del presupuesto puede diferir de la de la ficha
  -- (el paso 1 la deja editable), pero se congela como texto.
  v_os_id := nullif(p_payload ->> 'obra_social_id', '')::uuid;
  select nombre || coalesce(' ' || plan, '') into v_os_nombre
    from obras_sociales where id = v_os_id;

  insert into presupuestos (
    paciente_id, profesional_id, obra_social_id, obra_social_nombre,
    paciente_nombre, paciente_dni, paciente_telefono, paciente_afiliado,
    profesional_nombre, profesional_matricula,
    fecha_emision, valido_hasta, observaciones, nota_interna,
    estado, created_by
  ) values (
    v_pac.id, v_prof.id, v_os_id, v_os_nombre,
    v_pac.nombre, v_pac.dni, v_pac.telefono, v_pac.nro_afiliado,
    v_prof.nombre, v_prof.matricula,
    coalesce((p_payload ->> 'fecha_emision')::date, current_date),
    coalesce((p_payload ->> 'valido_hasta')::date, current_date + 30),
    nullif(p_payload ->> 'observaciones', ''),
    nullif(p_payload ->> 'nota_interna', ''),
    'borrador', auth.uid()
  )
  returning id, numero into v_id, v_numero;

  -- ── Ítems: snapshot completo, cobertura resuelta en el servidor ──
  for v_item in select * from jsonb_array_elements(p_payload -> 'items')
  loop
    v_monto := (v_item ->> 'monto')::numeric;
    v_tipo  := coalesce((v_item ->> 'cobertura_tipo')::tipo_cobertura, 'ninguna');
    v_valor := coalesce((v_item ->> 'cobertura_valor')::numeric, 0);
    v_cob   := calcular_cobertura(v_monto, v_tipo, v_valor);

    insert into presupuesto_items (
      presupuesto_id, orden, prestacion_id, arancel_id,
      nombre, codigo, descripcion, detalle,
      monto, cobertura_tipo, cobertura_valor, cobertura_monto, a_cargo,
      editado, cobertura_original_tipo, cobertura_original_valor, motivo_override
    ) values (
      v_id, v_orden,
      nullif(v_item ->> 'prestacion_id', '')::uuid,
      nullif(v_item ->> 'arancel_id', '')::uuid,
      v_item ->> 'nombre',
      nullif(v_item ->> 'codigo', ''),
      nullif(v_item ->> 'descripcion', ''),
      nullif(v_item ->> 'detalle', ''),
      v_monto, v_tipo, v_valor, v_cob, v_monto - v_cob,
      coalesce((v_item ->> 'editado')::boolean, false),
      nullif(v_item ->> 'cobertura_original_tipo', '')::tipo_cobertura,
      nullif(v_item ->> 'cobertura_original_valor', '')::numeric,
      nullif(v_item ->> 'motivo_override', '')
    );

    v_subtotal    := v_subtotal + v_monto;
    v_total_cob   := v_total_cob + v_cob;
    v_total_cargo := v_total_cargo + (v_monto - v_cob);
    v_orden       := v_orden + 1;
  end loop;

  -- ── Cuotas: el porcentaje manda, la última absorbe el redondeo ──
  v_cuotas_n := jsonb_array_length(coalesce(p_payload -> 'cuotas', '[]'::jsonb));
  if v_cuotas_n > 0 then
    -- Sin esta validación, unos porcentajes que suman más de 100 dejan
    -- la última cuota en negativo y la emisión aborta con un error de
    -- Postgres que no le dice nada a quien está cargando.
    if abs(coalesce((
      select sum((c ->> 'porcentaje')::numeric)
        from jsonb_array_elements(p_payload -> 'cuotas') c
    ), 0) - 100) > 0.01 then
      raise exception 'Las condiciones de pago tienen que sumar 100 %%';
    end if;

    v_orden := 0;
    for v_cuota in select * from jsonb_array_elements(p_payload -> 'cuotas')
    loop
      if v_orden = v_cuotas_n - 1 then
        v_cuota_monto := v_total_cargo - v_acum;      -- resto exacto
      else
        v_cuota_monto := round(v_total_cargo * ((v_cuota ->> 'porcentaje')::numeric / 100.0));
        v_acum := v_acum + v_cuota_monto;
      end if;

      insert into presupuesto_cuotas (presupuesto_id, orden, etiqueta, porcentaje, monto)
      values (v_id, v_orden, v_cuota ->> 'etiqueta',
              nullif(v_cuota ->> 'porcentaje', '')::numeric, v_cuota_monto);

      v_orden := v_orden + 1;
      v_cuotas_creadas := v_cuotas_creadas + 1;
    end loop;
  end if;

  update presupuestos
     set subtotal = v_subtotal,
         total_cobertura = v_total_cob,
         total_a_cargo = v_total_cargo,
         estado = v_estado,
         estado_desde = now()
   where id = v_id;

  insert into presupuesto_eventos (presupuesto_id, tipo, descripcion, estado_nuevo, autor_id, autor_nombre)
  values (v_id, 'creado',
          'Presupuesto ' || v_numero || ' creado con ' ||
          jsonb_array_length(p_payload -> 'items') || ' prestación(es)' ||
          case when v_cuotas_creadas > 0
               then ' y ' || v_cuotas_creadas || ' condición(es) de pago'
               else ' y pago en un solo momento' end,
          v_estado, auth.uid(), actor_nombre());

  return v_id;
end $$;


-- ─────────────────────────────────────────────────────────────
-- Duplicar con valores de hoy.
-- Para cada ítem busca el arancel vigente de su prestación y obra
-- social; si no hay, conserva el snapshot viejo. Nunca toca el original.
-- ─────────────────────────────────────────────────────────────


create or replace function duplicar_presupuesto(p_id uuid)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_orig        presupuestos%rowtype;
  v_new         uuid;
  v_numero      text;
  v_it          record;
  v_ar          aranceles%rowtype;
  v_os_item     uuid;
  v_monto       numeric;
  v_tipo        tipo_cobertura;
  v_valor       numeric;
  v_cob         numeric;
  v_arancel_id  uuid;
  v_vig_dias    int;
  v_subtotal    numeric := 0;
  v_total_cob   numeric := 0;
  v_total_cargo numeric := 0;
  v_orden       int := 0;
  v_overrides   int := 0;
  v_cuota       record;
  v_cuotas_n    int;
  v_acum        numeric := 0;
  v_cuota_monto numeric;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  select * into v_orig from presupuestos where id = p_id;
  if not found then raise exception 'Presupuesto inexistente'; end if;

  select coalesce(max(p.vigencia_dias), 30) into v_vig_dias
    from presupuesto_items pi
    join prestaciones p on p.id = pi.prestacion_id
   where pi.presupuesto_id = p_id;

  insert into presupuestos (
    paciente_id, profesional_id, obra_social_id, obra_social_nombre,
    paciente_nombre, paciente_dni, paciente_telefono, paciente_afiliado,
    profesional_nombre, profesional_matricula,
    fecha_emision, valido_hasta, observaciones,
    estado, duplicado_de, created_by
  )
  select
    p.paciente_id, p.profesional_id, p.obra_social_id, p.obra_social_nombre,
    -- Nombre, DNI y teléfono se refrescan desde la ficha: son datos de
    -- contacto, no precios.
    coalesce(pac.nombre, p.paciente_nombre),
    coalesce(pac.dni, p.paciente_dni),
    coalesce(pac.telefono, p.paciente_telefono),
    -- El afiliado pertenece a UNA obra social: sólo se refresca si la
    -- ficha sigue en la misma que el presupuesto. Si el paciente cambió
    -- de cobertura, mezclar los dos daría un documento incoherente.
    case
      when pac.obra_social_id is not distinct from p.obra_social_id
        then coalesce(pac.nro_afiliado, p.paciente_afiliado)
      else p.paciente_afiliado
    end,
    p.profesional_nombre, p.profesional_matricula,
    current_date, current_date + v_vig_dias, p.observaciones,
    'borrador', p.id, auth.uid()
  from presupuestos p
  left join pacientes pac on pac.id = p.paciente_id
  where p.id = p_id
  returning id, numero into v_new, v_numero;

  for v_it in
    select * from presupuesto_items where presupuesto_id = p_id order by orden
  loop
    if v_it.arancel_id is not null then
      select obra_social_id into v_os_item from aranceles where id = v_it.arancel_id;
    else
      v_os_item := v_orig.obra_social_id;
    end if;

    v_ar := null;
    if v_it.prestacion_id is not null then
      select * into v_ar from arancel_vigente(v_it.prestacion_id, v_os_item);
    end if;

    if v_ar.id is not null then
      v_monto      := v_ar.monto;
      v_tipo       := v_ar.cobertura_tipo;
      v_valor      := v_ar.cobertura_valor;
      v_arancel_id := v_ar.id;
    else
      v_monto      := v_it.monto;
      v_tipo       := v_it.cobertura_tipo;
      v_valor      := v_it.cobertura_valor;
      v_arancel_id := v_it.arancel_id;
    end if;

    v_cob := calcular_cobertura(v_monto, v_tipo, v_valor);

    insert into presupuesto_items (
      presupuesto_id, orden, prestacion_id, arancel_id,
      nombre, codigo, descripcion, detalle,
      monto, cobertura_tipo, cobertura_valor, cobertura_monto, a_cargo
    ) values (
      v_new, v_orden, v_it.prestacion_id, v_arancel_id,
      coalesce((select nombre from prestaciones where id = v_it.prestacion_id), v_it.nombre),
      v_it.codigo,
      coalesce((select descripcion from prestaciones where id = v_it.prestacion_id), v_it.descripcion),
      v_it.detalle,
      v_monto, v_tipo, v_valor, v_cob, v_monto - v_cob
    );

    v_subtotal    := v_subtotal + v_monto;
    v_total_cob   := v_total_cob + v_cob;
    v_total_cargo := v_total_cargo + (v_monto - v_cob);
    v_orden       := v_orden + 1;
  end loop;

  select count(*) into v_cuotas_n from presupuesto_cuotas where presupuesto_id = p_id;
  if v_cuotas_n > 0 then
    v_orden := 0;
    for v_cuota in
      select etiqueta, porcentaje from presupuesto_cuotas
       where presupuesto_id = p_id order by orden
    loop
      if v_orden = v_cuotas_n - 1 then
        -- Piso en 0: un negativo abortaría la emisión entera contra el
        -- check de `presupuesto_cuotas`.
        v_cuota_monto := greatest(0::numeric, v_total_cargo - v_acum);
      else
        v_cuota_monto := round(v_total_cargo * (coalesce(v_cuota.porcentaje, 0) / 100.0));
        v_acum := v_acum + v_cuota_monto;
      end if;

      insert into presupuesto_cuotas (presupuesto_id, orden, etiqueta, porcentaje, monto)
      values (v_new, v_orden, v_cuota.etiqueta, v_cuota.porcentaje, v_cuota_monto);

      v_orden := v_orden + 1;
    end loop;
  end if;

  update presupuestos
     set subtotal = v_subtotal,
         total_cobertura = v_total_cob,
         total_a_cargo = v_total_cargo
   where id = v_new;

  select count(*) into v_overrides
    from presupuesto_items where presupuesto_id = p_id and editado;

  insert into presupuesto_eventos (presupuesto_id, tipo, descripcion, estado_nuevo, autor_id, autor_nombre)
  values (v_new, 'duplicado',
          'Duplicado de ' || v_orig.numero || ' con los valores vigentes al ' ||
          to_char(current_date, 'DD/MM/YYYY') ||
          case when v_overrides > 0
               then '. No se heredaron ' || v_overrides || ' cobertura(s) editada(s) a mano.'
               else '' end,
          'borrador', auth.uid(), actor_nombre());

  insert into presupuesto_eventos (presupuesto_id, tipo, descripcion, autor_id, autor_nombre)
  values (p_id, 'duplicado', 'Se duplicó en ' || v_numero, auth.uid(), actor_nombre());

  return v_new;
end $$;


-- ─────────────────────────────────────────────────────────────
-- Cambio de estado + evento, en una transacción.
-- ─────────────────────────────────────────────────────────────


create or replace function cambiar_estado(
  p_id      uuid,
  p_estado  estado_presupuesto,
  p_motivo  motivo_perdida default null,
  p_nota    text default null
) returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_ant   estado_presupuesto;
  v_desc  text;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  select estado into v_ant from presupuestos where id = p_id for update;
  if not found then raise exception 'Presupuesto inexistente'; end if;
  if v_ant = p_estado then return; end if;

  -- Un presupuesto emitido no vuelve a borrador: eso reabriría sus ítems
  -- a edición y rompería la regla del snapshot. Se duplica en su lugar.
  if p_estado = 'borrador' and v_ant <> 'borrador' then
    raise exception 'Un presupuesto emitido no vuelve a borrador: duplicalo';
  end if;

  update presupuestos
     set estado = p_estado,
         motivo_perdida      = case when p_estado = 'perdido' then p_motivo else null end,
         motivo_perdida_nota = case when p_estado = 'perdido' then nullif(p_nota, '') else null end
   where id = p_id;

  v_desc := 'De ' || v_ant || ' a ' || p_estado;
  if p_estado = 'perdido' and p_motivo is not null then
    v_desc := v_desc || ' · motivo: ' || replace(p_motivo::text, '_', ' ');
  end if;

  insert into presupuesto_eventos (
    presupuesto_id, tipo, descripcion, estado_anterior, estado_nuevo, autor_id, autor_nombre
  ) values (p_id, 'estado_cambiado', v_desc, v_ant, p_estado, auth.uid(), actor_nombre());
end $$;


-- ─────────────────────────────────────────────────────────────
-- Evento suelto (nota interna, PDF generado, envío por WhatsApp).
-- ─────────────────────────────────────────────────────────────


create or replace function registrar_evento(
  p_id     uuid,
  p_tipo   text,
  p_desc   text
) returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  if p_tipo not in ('creado','item_editado','pdf_generado','enviado_whatsapp','estado_cambiado','nota','duplicado') then
    raise exception 'Tipo de evento desconocido: %', p_tipo;
  end if;

  insert into presupuesto_eventos (presupuesto_id, tipo, descripcion, autor_id, autor_nombre)
  values (p_id, p_tipo, p_desc, auth.uid(), actor_nombre());
end $$;


-- ─────────────────────────────────────────────────────────────
-- enviado → pendiente a los 7 días sin cambio.
-- La corre el cron diario (/api/cron/pendientes) o pg_cron.
-- ─────────────────────────────────────────────────────────────


create or replace function marcar_pendientes() returns int
language plpgsql security definer
set search_path = public
as $$
declare
  r record;
  n int := 0;
begin
  for r in
    select id, estado from presupuestos
     where estado = 'enviado'
       and estado_desde < now() - interval '7 days'
  loop
    update presupuestos set estado = 'pendiente' where id = r.id;

    insert into presupuesto_eventos (
      presupuesto_id, tipo, descripcion, estado_anterior, estado_nuevo, autor_nombre
    ) values (
      r.id, 'estado_cambiado',
      'Pasó a pendiente automáticamente: 7 días sin respuesta',
      'enviado', 'pendiente', 'Sistema'
    );
    n := n + 1;
  end loop;
  return n;
end $$;


-- ════════════════════════════════════════════════════════════════════
-- Vistas
-- ════════════════════════════════════════════════════════════════════

-- security_invoker: la vista respeta la RLS del usuario que consulta,
-- no la del owner. Sin esto una vista es un agujero en la RLS.

create view aranceles_vigentes with (security_invoker = true) as
select a.*, p.nombre as prestacion, p.codigo, p.rubro,
       coalesce(os.nombre || coalesce(' ' || os.plan, ''), 'Particular') as obra_social,
       (select count(*) from presupuesto_items pi where pi.arancel_id = a.id) as usos
  from aranceles a
  join prestaciones p on p.id = a.prestacion_id
  left join obras_sociales os on os.id = a.obra_social_id
 where a.vigente_desde <= current_date
   and (a.vigente_hasta is null or a.vigente_hasta >= current_date);


-- Listado de home y pipeline: agrega la prestación principal (la de
-- mayor monto) sin obligar al cliente a traerse todos los ítems.

create view presupuestos_listado with (security_invoker = true) as
select
  p.*,
  (select pi.nombre
     from presupuesto_items pi
    where pi.presupuesto_id = p.id
    order by pi.monto desc, pi.orden asc
    limit 1) as prestacion_principal,
  (select count(*) from presupuesto_items pi where pi.presupuesto_id = p.id) as items_count,
  greatest(0, extract(day from now() - p.estado_desde)::int) as dias_en_estado
from presupuestos p;


-- ─── rls ───────────────────────────────────────


alter table profesionales       enable row level security;
alter table obras_sociales      enable row level security;
alter table pacientes           enable row level security;
alter table prestaciones        enable row level security;
alter table prestacion_cuotas   enable row level security;
alter table aranceles           enable row level security;
alter table presupuestos        enable row level security;
alter table presupuesto_items   enable row level security;
alter table presupuesto_cuotas  enable row level security;
alter table presupuesto_eventos enable row level security;

-- ── Tablas con acceso completo para el equipo ────────────────

drop policy if exists "equipo lee" on profesionales;
create policy "equipo lee" on profesionales for select using (auth.uid() is not null);
drop policy if exists "equipo escribe" on profesionales;
create policy "equipo escribe" on profesionales for all    using (auth.uid() is not null)
                                                           with check (auth.uid() is not null);

drop policy if exists "equipo lee" on obras_sociales;
create policy "equipo lee" on obras_sociales for select using (auth.uid() is not null);
drop policy if exists "equipo escribe" on obras_sociales;
create policy "equipo escribe" on obras_sociales for all    using (auth.uid() is not null)
                                                            with check (auth.uid() is not null);

drop policy if exists "equipo lee" on pacientes;
create policy "equipo lee" on pacientes for select using (auth.uid() is not null);
drop policy if exists "equipo escribe" on pacientes;
create policy "equipo escribe" on pacientes for all    using (auth.uid() is not null)
                                                       with check (auth.uid() is not null);

drop policy if exists "equipo lee" on prestaciones;
create policy "equipo lee" on prestaciones for select using (auth.uid() is not null);
drop policy if exists "equipo escribe" on prestaciones;
create policy "equipo escribe" on prestaciones for all    using (auth.uid() is not null)
                                                          with check (auth.uid() is not null);

drop policy if exists "equipo lee" on prestacion_cuotas;
create policy "equipo lee" on prestacion_cuotas for select using (auth.uid() is not null);
drop policy if exists "equipo escribe" on prestacion_cuotas;
create policy "equipo escribe" on prestacion_cuotas for all    using (auth.uid() is not null)
                                                               with check (auth.uid() is not null);

drop policy if exists "equipo lee" on presupuestos;
create policy "equipo lee" on presupuestos for select using (auth.uid() is not null);
drop policy if exists "equipo escribe" on presupuestos;
create policy "equipo escribe" on presupuestos for all    using (auth.uid() is not null)
                                                          with check (auth.uid() is not null);

drop policy if exists "equipo lee" on presupuesto_items;
create policy "equipo lee" on presupuesto_items for select using (auth.uid() is not null);
drop policy if exists "equipo escribe" on presupuesto_items;
create policy "equipo escribe" on presupuesto_items for all    using (auth.uid() is not null)
                                                               with check (auth.uid() is not null);

drop policy if exists "equipo lee" on presupuesto_cuotas;
create policy "equipo lee" on presupuesto_cuotas for select using (auth.uid() is not null);
drop policy if exists "equipo escribe" on presupuesto_cuotas;
create policy "equipo escribe" on presupuesto_cuotas for all    using (auth.uid() is not null)
                                                                with check (auth.uid() is not null);

-- ── Excepción: aranceles es append-only ──────────────────────
-- Sin policy de DELETE. Se puede leer, insertar y cerrar la vigencia
-- (UPDATE de vigente_hasta), pero guard_arancel_inmutable bloquea
-- cualquier cambio de monto o cobertura si el arancel ya fue usado.

drop policy if exists "equipo lee" on aranceles;
create policy "equipo lee" on aranceles for select using (auth.uid() is not null);
drop policy if exists "equipo inserta" on aranceles;
create policy "equipo inserta" on aranceles for insert with check (auth.uid() is not null);
drop policy if exists "equipo cierra" on aranceles;
create policy "equipo cierra" on aranceles for update using (auth.uid() is not null)
                                                         with check (auth.uid() is not null);

-- ── Excepción: el historial no se borra ni se edita ──────────

drop policy if exists "equipo lee" on presupuesto_eventos;
create policy "equipo lee" on presupuesto_eventos for select using (auth.uid() is not null);
drop policy if exists "equipo inserta" on presupuesto_eventos;
create policy "equipo inserta" on presupuesto_eventos for insert with check (auth.uid() is not null);

-- ── Ejecución de las RPC ─────────────────────────────────────
-- Son security definer: hay que restringir quién puede llamarlas.

revoke execute on function nueva_vigencia(uuid, uuid, numeric, tipo_cobertura, numeric, date) from public, anon;
revoke execute on function aumento_masivo(text, uuid, boolean, numeric, date) from public, anon;
revoke execute on function crear_presupuesto(jsonb) from public, anon;
revoke execute on function duplicar_presupuesto(uuid) from public, anon;
revoke execute on function cambiar_estado(uuid, estado_presupuesto, motivo_perdida, text) from public, anon;
revoke execute on function registrar_evento(uuid, text, text) from public, anon;
revoke execute on function marcar_pendientes() from public, anon, authenticated;

grant execute on function nueva_vigencia(uuid, uuid, numeric, tipo_cobertura, numeric, date) to authenticated;
grant execute on function aumento_masivo(text, uuid, boolean, numeric, date) to authenticated;
grant execute on function crear_presupuesto(jsonb) to authenticated;
grant execute on function duplicar_presupuesto(uuid) to authenticated;
grant execute on function cambiar_estado(uuid, estado_presupuesto, motivo_perdida, text) to authenticated;
grant execute on function registrar_evento(uuid, text, text) to authenticated;
-- marcar_pendientes la corre sólo el cron con la service role key.
grant execute on function marcar_pendientes() to service_role;


-- ─── items check ───────────────────────────────────────


alter table presupuesto_items
  add constraint presupuesto_items_monto_no_negativo
    check (monto >= 0),
  add constraint presupuesto_items_cobertura_en_rango
    check (cobertura_monto >= 0 and cobertura_monto <= monto),
  add constraint presupuesto_items_a_cargo_cierra
    check (a_cargo = monto - cobertura_monto),
  add constraint presupuesto_items_porcentaje_valido
    check (cobertura_tipo <> 'porcentaje' or cobertura_valor between 0 and 100);

-- Las cuotas tampoco pueden ser negativas.
alter table presupuesto_cuotas
  add constraint presupuesto_cuotas_monto_no_negativo
    check (monto >= 0);


-- ─── vigencia por fecha ───────────────────────────────────────


-- ─────────────────────────────────────────────────────────────
-- Una sola definición de «el arancel que rige hoy», para que no
-- vuelva a divergir entre el SQL y el cliente.
-- ─────────────────────────────────────────────────────────────


create or replace function arancel_vigente(
  p_prestacion  uuid,
  p_obra_social uuid,
  p_fecha       date default current_date
) returns aranceles
language sql stable
set search_path = public
as $$
  select a.*
    from aranceles a
   where a.prestacion_id = p_prestacion
     and a.obra_social_id is not distinct from p_obra_social
     and a.vigente_desde <= p_fecha
     and (a.vigente_hasta is null or a.vigente_hasta >= p_fecha)
   order by a.vigente_desde desc
   limit 1
$$;


revoke execute on function arancel_vigente(uuid, uuid, date) from public, anon;
grant execute on function arancel_vigente(uuid, uuid, date) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- La grilla de la pantalla 10 muestra lo que rige HOY.
-- ─────────────────────────────────────────────────────────────


-- ─────────────────────────────────────────────────────────────
-- Los aumentos ya cargados que todavía no arrancaron. Sin esta
-- vista, arreglar la de arriba los haría desaparecer de la pantalla
-- y nadie sabría que quedaron programados.
-- ─────────────────────────────────────────────────────────────


create view aranceles_programados with (security_invoker = true) as
select a.*, p.nombre as prestacion, p.codigo, p.rubro,
       coalesce(os.nombre || coalesce(' ' || os.plan, ''), 'Particular') as obra_social,
       (a.vigente_desde - current_date) as dias_para_arrancar
  from aranceles a
  join prestaciones p on p.id = a.prestacion_id
  left join obras_sociales os on os.id = a.obra_social_id
 where a.vigente_desde > current_date;


-- ─────────────────────────────────────────────────────────────
-- Duplicar «con los valores de hoy» tiene que usar los de hoy.
-- ─────────────────────────────────────────────────────────────


revoke execute on function duplicar_presupuesto(uuid) from public, anon;
grant execute on function duplicar_presupuesto(uuid) to authenticated;


-- ─── guardas en la base ───────────────────────────────────────


-- ─────────────────────────────────────────────────────────────
-- 1) Un presupuesto emitido no vuelve a borrador ni cambia de
--    contenido. Lo único que sigue vivo es el seguimiento.
-- ─────────────────────────────────────────────────────────────


create or replace function guard_presupuesto_emitido() returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Mientras es borrador se puede tocar todo: todavía no es documento.
  if old.estado = 'borrador' then
    return new;
  end if;

  if new.estado = 'borrador' then
    raise exception
      'Un presupuesto emitido no vuelve a borrador: duplicalo en lugar de reabrirlo';
  end if;

  -- Congelado: es lo que se le prometió al paciente.
  if new.numero                is distinct from old.numero
     or new.paciente_id        is distinct from old.paciente_id
     or new.profesional_id     is distinct from old.profesional_id
     or new.obra_social_id     is distinct from old.obra_social_id
     or new.obra_social_nombre is distinct from old.obra_social_nombre
     or new.paciente_nombre    is distinct from old.paciente_nombre
     or new.paciente_dni       is distinct from old.paciente_dni
     or new.paciente_afiliado  is distinct from old.paciente_afiliado
     or new.profesional_nombre is distinct from old.profesional_nombre
     or new.profesional_matricula is distinct from old.profesional_matricula
     or new.fecha_emision      is distinct from old.fecha_emision
     or new.valido_hasta       is distinct from old.valido_hasta
     or new.subtotal           is distinct from old.subtotal
     or new.total_cobertura    is distinct from old.total_cobertura
     or new.total_a_cargo      is distinct from old.total_a_cargo
     or new.observaciones      is distinct from old.observaciones
     or new.duplicado_de       is distinct from old.duplicado_de
     or new.created_by         is distinct from old.created_by
     or new.created_at         is distinct from old.created_at
  then
    raise exception
      'Los valores de un presupuesto emitido no se editan: duplicalo con los valores de hoy';
  end if;

  -- Siguen abiertos a propósito: estado, estado_desde, motivo_perdida,
  -- motivo_perdida_nota, nota_interna, pdf_path, paciente_telefono
  -- (se puede completar al mandar el WhatsApp) y updated_at.
  return new;
end $$;


create trigger trg_presupuesto_emitido
  before update on presupuestos
  for each row execute function guard_presupuesto_emitido();

-- ─────────────────────────────────────────────────────────────
-- 2) Un arancel usado tampoco cambia de prestación ni de obra social.
-- ─────────────────────────────────────────────────────────────


-- ─── duplicar fiel ───────────────────────────────────────


revoke execute on function duplicar_presupuesto(uuid) from public, anon;
grant execute on function duplicar_presupuesto(uuid) to authenticated;


-- ─── alta historial ───────────────────────────────────────


revoke execute on function crear_presupuesto(jsonb) from public, anon;
grant execute on function crear_presupuesto(jsonb) to authenticated;


-- ─── aumento exacto ───────────────────────────────────────


revoke execute on function aumento_masivo(text, uuid, boolean, numeric, date) from public, anon;
grant execute on function aumento_masivo(text, uuid, boolean, numeric, date) to authenticated;


-- ─── duplicado afiliado ───────────────────────────────────────


create view aranceles_usos with (security_invoker = true) as
select a.id as arancel_id,
       count(pi.id) as usos
  from aranceles a
  left join presupuesto_items pi on pi.arancel_id = a.id
 group by a.id;


revoke execute on function duplicar_presupuesto(uuid) from public, anon;
grant execute on function duplicar_presupuesto(uuid) to authenticated;


-- ─── admin ───────────────────────────────────────


alter table profesionales
  add column if not exists es_admin boolean not null default false;

comment on column profesionales.es_admin is
  'Puede crear usuarios, cambiar contraseñas y dar de baja al equipo.';

/**
 * ¿El usuario de esta sesión es admin?
 *
 * `security definer` para que pueda leer `profesionales` sin depender
 * de la policy del que consulta, y `stable` para que Postgres la
 * evalúe una vez por consulta.
 */

create or replace function es_admin() returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce(
    (select p.es_admin from profesionales p where p.user_id = auth.uid() limit 1),
    false
  )
$$;


revoke execute on function es_admin() from public, anon;
grant execute on function es_admin() to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Sólo un admin cambia la marca de admin.
--
-- Sin esto, cualquiera del equipo podría hacerse admin con un UPDATE
-- directo: la policy de `profesionales` deja escribir a todo el mundo
-- porque el consultorio comparte los datos.
-- ─────────────────────────────────────────────────────────────


create or replace function guard_es_admin() returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- PostgREST entra con el rol del token: `authenticated` con la anon
  -- key, `service_role` con la de servicio. `postgres` es el editor SQL
  -- del dashboard, que es la salida de emergencia del consultorio.
  if current_user in ('service_role', 'supabase_admin', 'postgres') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.es_admin and not es_admin() then
      raise exception 'Sólo un administrador puede dar de alta a otro administrador';
    end if;
    return new;
  end if;

  if new.es_admin is distinct from old.es_admin and not es_admin() then
    raise exception 'Sólo un administrador puede cambiar los permisos del equipo';
  end if;

  return new;
end $$;


create trigger trg_es_admin
  before update on profesionales
  for each row execute function guard_es_admin();


-- ─── guarda alta admin ───────────────────────────────────────


drop trigger if exists trg_es_admin_alta on profesionales;

create trigger trg_es_admin_alta
  before insert on profesionales
  for each row execute function guard_es_admin();


-- ─── estadisticas ───────────────────────────────────────


/** Ganado = el paciente dijo que sí, haya arrancado o no el tratamiento. */

create or replace function stats_ganado(e estado_presupuesto) returns boolean
language sql immutable
as $$ select e in ('aceptado', 'iniciado') $$;


comment on function stats_ganado(estado_presupuesto) is
  'Misma definición de «aceptado» que usa la Home. Si cambia, cambian las dos.';

-- ─────────────────────────────────────────────────────────────
-- Los números de arriba
-- ─────────────────────────────────────────────────────────────


create or replace function stats_resumen(p_desde date, p_hasta date)
returns table (
  emitidos        bigint,
  monto_emitido   numeric,
  ganados         bigint,
  monto_ganado    numeric,
  perdidos        bigint,
  en_juego        bigint,
  monto_en_juego  numeric,
  ticket          numeric,
  dias_a_cierre   numeric
)
language sql stable
set search_path = public
as $$
  with base as (
    select p.id, p.estado, p.total_a_cargo, p.fecha_emision
      from presupuestos p
     where p.estado <> 'borrador'
       and p.fecha_emision between p_desde and p_hasta
  ),
  -- Cuándo se ganó cada uno, según el historial append-only.
  cierres as (
    select b.id, min(e.created_at) as cerrado_en, b.fecha_emision
      from base b
      join presupuesto_eventos e on e.presupuesto_id = b.id
     where e.estado_nuevo is not null and stats_ganado(e.estado_nuevo)
     group by b.id, b.fecha_emision
  )
  select
    count(*),
    coalesce(sum(b.total_a_cargo), 0),
    count(*) filter (where stats_ganado(b.estado)),
    coalesce(sum(b.total_a_cargo) filter (where stats_ganado(b.estado)), 0),
    count(*) filter (where b.estado = 'perdido'),
    count(*) filter (where b.estado <> 'perdido' and not stats_ganado(b.estado)),
    coalesce(sum(b.total_a_cargo) filter (where b.estado <> 'perdido' and not stats_ganado(b.estado)), 0),
    -- El ticket es sobre lo emitido: es «cuánto sale un presupuesto de
    -- este consultorio», no «cuánto sale uno de los que salieron bien».
    round(coalesce(avg(b.total_a_cargo), 0)),
    (select round(percentile_cont(0.5) within group (
              order by extract(epoch from (c.cerrado_en - c.fecha_emision::timestamptz)) / 86400
            )::numeric, 1)
       from cierres c)
  from base b;
$$;


-- ─────────────────────────────────────────────────────────────
-- Embudo: cuántos LLEGARON a cada etapa, no cuántos están hoy
--
-- La diferencia importa. «Hay 3 en interesado» es una foto de hoy;
-- «de 100 emitidos, 40 llegaron a interesado» es lo que dice dónde se
-- cae la venta. La trayectoria sale del historial, que es append-only:
-- el `creado` trae el estado inicial y cada `estado_cambiado` el
-- siguiente.
-- ─────────────────────────────────────────────────────────────


create or replace function stats_embudo(p_desde date, p_hasta date)
returns table (
  estado      estado_presupuesto,
  alcanzaron  bigint,
  monto       numeric
)
language sql stable
set search_path = public
as $$
  with base as (
    select p.id, p.total_a_cargo
      from presupuestos p
     where p.estado <> 'borrador'
       and p.fecha_emision between p_desde and p_hasta
  ),
  trayectoria as (
    select distinct b.id, e.estado_nuevo as estado, b.total_a_cargo
      from base b
      join presupuesto_eventos e on e.presupuesto_id = b.id
     where e.estado_nuevo is not null
       and e.estado_nuevo <> 'borrador'
  ),
  etapas as (
    select unnest(array[
      'realizado', 'enviado', 'pendiente', 'interesado', 'aceptado', 'iniciado'
    ]::estado_presupuesto[]) as estado
  )
  select
    et.estado,
    count(t.id),
    coalesce(sum(t.total_a_cargo), 0)
  from etapas et
  left join trayectoria t on t.estado = et.estado
  group by et.estado
  -- El orden del embudo es el de la máquina de estados, no el alfabético.
  order by array_position(
    array['realizado', 'enviado', 'pendiente', 'interesado', 'aceptado', 'iniciado']::estado_presupuesto[],
    et.estado
  );
$$;


-- ─────────────────────────────────────────────────────────────
-- Cuánto tarda un presupuesto en cada etapa
--
-- Mediana y no promedio: un presupuesto olvidado tres meses en
-- «enviado» corre el promedio y hace parecer lento a un circuito que
-- no lo es.
--
-- Sólo tramos CERRADOS —los que ya salieron de esa etapa—. Contar el
-- tiempo de los que todavía están adentro tira la mediana para abajo:
-- se los mide a mitad de camino.
-- ─────────────────────────────────────────────────────────────


create or replace function stats_tiempos(p_desde date, p_hasta date)
returns table (
  estado       estado_presupuesto,
  mediana_dias numeric,
  p90_dias     numeric,
  casos        bigint
)
language sql stable
set search_path = public
as $$
  with base as (
    select p.id
      from presupuestos p
     where p.estado <> 'borrador'
       and p.fecha_emision between p_desde and p_hasta
  ),
  tramos as (
    select
      e.estado_nuevo as estado,
      lead(e.created_at) over (partition by e.presupuesto_id order by e.created_at)
        - e.created_at as duracion
    from presupuesto_eventos e
    join base b on b.id = e.presupuesto_id
   where e.estado_nuevo is not null
     and e.estado_nuevo <> 'borrador'
  )
  select
    t.estado,
    round(percentile_cont(0.5) within group (order by extract(epoch from t.duracion) / 86400)::numeric, 1),
    round(percentile_cont(0.9) within group (order by extract(epoch from t.duracion) / 86400)::numeric, 1),
    count(*)
  from tramos t
  where t.duracion is not null
    -- Sólo las etapas del circuito. «Perdido» es terminal: si aparece
    -- con duración es porque alguien lo revivió, y eso no es «cuánto
    -- tarda un presupuesto en perderse».
    and t.estado = any(array[
      'realizado', 'enviado', 'pendiente', 'interesado', 'aceptado', 'iniciado'
    ]::estado_presupuesto[])
  group by t.estado
  order by array_position(
    array['realizado', 'enviado', 'pendiente', 'interesado', 'aceptado', 'iniciado']::estado_presupuesto[],
    t.estado
  );
$$;


-- ─────────────────────────────────────────────────────────────
-- Mes a mes
-- ─────────────────────────────────────────────────────────────


create or replace function stats_mensual(p_desde date, p_hasta date)
returns table (
  mes            date,
  emitidos       bigint,
  ganados        bigint,
  perdidos       bigint,
  monto_emitido  numeric,
  monto_ganado   numeric,
  ticket         numeric
)
language sql stable
set search_path = public
as $$
  with meses as (
    select generate_series(
      date_trunc('month', p_desde)::date,
      date_trunc('month', p_hasta)::date,
      interval '1 month'
    )::date as mes
  ),
  base as (
    select date_trunc('month', p.fecha_emision)::date as mes,
           p.estado, p.total_a_cargo
      from presupuestos p
     where p.estado <> 'borrador'
       and p.fecha_emision between p_desde and p_hasta
  )
  -- Los meses sin actividad van igual, en cero: un hueco en la serie
  -- se lee como «no pasó nada» sólo si el mes está dibujado.
  select
    m.mes,
    count(b.*),
    count(b.*) filter (where stats_ganado(b.estado)),
    count(b.*) filter (where b.estado = 'perdido'),
    coalesce(sum(b.total_a_cargo), 0),
    coalesce(sum(b.total_a_cargo) filter (where stats_ganado(b.estado)), 0),
    round(coalesce(avg(b.total_a_cargo), 0))
  from meses m
  left join base b on b.mes = m.mes
  group by m.mes
  order by m.mes;
$$;


-- ─────────────────────────────────────────────────────────────
-- Por qué se pierden
-- ─────────────────────────────────────────────────────────────


create or replace function stats_motivos(p_desde date, p_hasta date)
returns table (
  motivo motivo_perdida,
  casos  bigint,
  monto  numeric
)
language sql stable
set search_path = public
as $$
  select p.motivo_perdida, count(*), coalesce(sum(p.total_a_cargo), 0)
    from presupuestos p
   where p.estado = 'perdido'
     and p.motivo_perdida is not null
     and p.fecha_emision between p_desde and p_hasta
   group by p.motivo_perdida
   order by count(*) desc;
$$;


-- ─────────────────────────────────────────────────────────────
-- Obras sociales
--
-- El nombre sale del snapshot del presupuesto (`obra_social_nombre`),
-- no de un join: si mañana la obra social cambia de nombre, lo que se
-- presupuestó se presupuestó con el de ese día. Se agrupa por id para
-- que un cambio de nombre no parta la fila en dos, y se muestra el
-- último nombre visto.
-- ─────────────────────────────────────────────────────────────


create or replace function stats_obras_sociales(p_desde date, p_hasta date)
returns table (
  obra_social_id  uuid,
  nombre          text,
  presupuestos    bigint,
  monto_a_cargo   numeric,
  cobertura_pct   numeric,
  ganados         bigint,
  tasa            numeric,
  ticket          numeric
)
language sql stable
set search_path = public
as $$
  select
    p.obra_social_id,
    coalesce(
      (array_agg(p.obra_social_nombre order by p.fecha_emision desc)
        filter (where p.obra_social_nombre is not null))[1],
      'Particular'
    ),
    count(*),
    coalesce(sum(p.total_a_cargo), 0),
    -- Cobertura efectiva: qué porción del arancel se comió la obra
    -- social de verdad, incluidos los overrides del propio presupuesto.
    round(100 * coalesce(sum(p.total_cobertura), 0) / nullif(sum(p.subtotal), 0), 1),
    count(*) filter (where stats_ganado(p.estado)),
    round(100.0 * count(*) filter (where stats_ganado(p.estado)) / nullif(count(*), 0)),
    round(coalesce(avg(p.total_a_cargo), 0))
  from presupuestos p
  where p.estado <> 'borrador'
    and p.fecha_emision between p_desde and p_hasta
  group by p.obra_social_id
  order by count(*) desc;
$$;


-- ─────────────────────────────────────────────────────────────
-- Prestaciones
--
-- Se agrupa por `prestacion_id` y se muestra el último nombre del
-- snapshot. Los ítems sueltos (sin prestación del catálogo) se agrupan
-- por su nombre normalizado.
-- ─────────────────────────────────────────────────────────────


create or replace function stats_prestaciones(p_desde date, p_hasta date)
returns table (
  clave          text,
  nombre         text,
  codigo         text,
  veces          bigint,
  presupuestos   bigint,
  monto_prom     numeric,
  total_a_cargo  numeric,
  ganados        bigint,
  tasa           numeric
)
language sql stable
set search_path = public
as $$
  with items as (
    select
      coalesce(i.prestacion_id::text, 'suelta:' || lower(i.nombre)) as clave,
      i.nombre, i.codigo, i.monto, i.a_cargo,
      p.id as presupuesto_id, p.estado, p.fecha_emision
    from presupuesto_items i
    join presupuestos p on p.id = i.presupuesto_id
   where p.estado <> 'borrador'
     and p.fecha_emision between p_desde and p_hasta
  )
  select
    it.clave,
    (array_agg(it.nombre order by it.fecha_emision desc))[1],
    (array_agg(it.codigo order by it.fecha_emision desc))[1],
    count(*),
    count(distinct it.presupuesto_id),
    round(avg(it.monto)),
    coalesce(sum(it.a_cargo), 0),
    count(distinct it.presupuesto_id) filter (where stats_ganado(it.estado)),
    -- La tasa es por presupuesto, no por ítem: un presupuesto con dos
    -- coronas se ganó una vez, no dos.
    round(100.0 * count(distinct it.presupuesto_id) filter (where stats_ganado(it.estado))
          / nullif(count(distinct it.presupuesto_id), 0))
  from items it
  group by it.clave
  order by count(*) desc;
$$;


-- ─────────────────────────────────────────────────────────────
-- Profesionales
-- ─────────────────────────────────────────────────────────────


create or replace function stats_profesionales(p_desde date, p_hasta date)
returns table (
  profesional_id uuid,
  nombre         text,
  emitidos       bigint,
  ganados        bigint,
  tasa           numeric,
  monto_ganado   numeric,
  ticket         numeric
)
language sql stable
set search_path = public
as $$
  select
    p.profesional_id,
    (array_agg(p.profesional_nombre order by p.fecha_emision desc))[1],
    count(*),
    count(*) filter (where stats_ganado(p.estado)),
    round(100.0 * count(*) filter (where stats_ganado(p.estado)) / nullif(count(*), 0)),
    coalesce(sum(p.total_a_cargo) filter (where stats_ganado(p.estado)), 0),
    round(coalesce(avg(p.total_a_cargo), 0))
  from presupuestos p
  where p.estado <> 'borrador'
    and p.fecha_emision between p_desde and p_hasta
  group by p.profesional_id
  order by count(*) desc;
$$;


-- ─────────────────────────────────────────────────────────────
-- Pacientes: cuántos vuelven
--
-- La recurrencia se mide sobre TODA la historia del paciente, no sobre
-- la ventana: alguien que volvió en marzo volvió, aunque se esté
-- mirando septiembre. La ventana elige de quiénes hablamos; el conteo
-- mira su historia entera.
-- ─────────────────────────────────────────────────────────────


create or replace function stats_pacientes(p_desde date, p_hasta date)
returns table (
  pacientes          bigint,
  con_uno            bigint,
  recurrentes        bigint,
  tasa_recurrencia   numeric,
  prom_por_paciente  numeric,
  dias_entre         numeric,
  monto_por_paciente numeric
)
language sql stable
set search_path = public
as $$
  with delaVentana as (
    select distinct p.paciente_id
      from presupuestos p
     where p.estado <> 'borrador'
       and p.fecha_emision between p_desde and p_hasta
  ),
  historia as (
    select p.paciente_id, p.fecha_emision, p.total_a_cargo,
           lag(p.fecha_emision) over (partition by p.paciente_id order by p.fecha_emision) as anterior
      from presupuestos p
      join delaVentana v on v.paciente_id = p.paciente_id
     where p.estado <> 'borrador'
  ),
  porPaciente as (
    select paciente_id, count(*) as n, sum(total_a_cargo) as monto
      from historia group by paciente_id
  )
  select
    count(*),
    count(*) filter (where pp.n = 1),
    count(*) filter (where pp.n > 1),
    round(100.0 * count(*) filter (where pp.n > 1) / nullif(count(*), 0)),
    round(avg(pp.n), 2),
    (select round(percentile_cont(0.5) within group (order by (h.fecha_emision - h.anterior))::numeric, 0)
       from historia h where h.anterior is not null),
    round(coalesce(avg(pp.monto), 0))
  from porPaciente pp;
$$;


-- ─────────────────────────────────────────────────────────────
-- Qué antigüedad tiene lo que está en juego HOY
--
-- Sin ventana a propósito: es la pregunta «¿a quién tengo que llamar
-- hoy?», y no depende del rango que se esté mirando.
-- ─────────────────────────────────────────────────────────────


create or replace function stats_aging()
returns table (
  tramo  text,
  orden  int,
  casos  bigint,
  monto  numeric
)
language sql stable
set search_path = public
as $$
  with abiertos as (
    select
      p.total_a_cargo,
      (current_date - p.estado_desde::date) as dias
    from presupuestos p
    where p.estado <> 'borrador'
      and p.estado <> 'perdido'
      and not stats_ganado(p.estado)
  ),
  tramos as (
    select
      case
        when dias <= 7  then 'Hasta 7 días'
        when dias <= 15 then '8 a 15 días'
        when dias <= 30 then '16 a 30 días'
        else 'Más de 30 días'
      end as tramo,
      case
        when dias <= 7  then 1
        when dias <= 15 then 2
        when dias <= 30 then 3
        else 4
      end as orden,
      total_a_cargo
    from abiertos
  ),
  todos as (
    select * from (values
      ('Hasta 7 días', 1), ('8 a 15 días', 2), ('16 a 30 días', 3), ('Más de 30 días', 4)
    ) as t(tramo, orden)
  )
  select t.tramo, t.orden, count(x.*), coalesce(sum(x.total_a_cargo), 0)
    from todos t
    left join tramos x on x.orden = t.orden
   group by t.tramo, t.orden
   order by t.orden;
$$;


-- ─────────────────────────────────────────────────────────────
-- Evolución del precio de una prestación
--
-- Esto sólo se puede contestar porque `aranceles` es append-only: cada
-- cambio de precio dejó su fila con la fecha desde la que rigió. Es la
-- recompensa de la regla más estricta del sistema.
-- ─────────────────────────────────────────────────────────────


create or replace function stats_precios(p_prestacion uuid)
returns table (
  vigente_desde date,
  obra_social   text,
  monto         numeric
)
language sql stable
set search_path = public
as $$
  select
    a.vigente_desde,
    coalesce(os.nombre, 'Particular'),
    a.monto
  from aranceles a
  left join obras_sociales os on os.id = a.obra_social_id
  where a.prestacion_id = p_prestacion
  order by a.vigente_desde, coalesce(os.nombre, 'Particular');
$$;

