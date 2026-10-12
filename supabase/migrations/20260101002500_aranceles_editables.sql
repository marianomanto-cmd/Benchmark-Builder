-- ════════════════════════════════════════════════════════════════════
-- Smile Lab · Presupuestos — 26 · Un arancel se corrige y se borra,
--                                  y queda escrito
--
-- El consultorio pidió poder crear, editar y borrar cualquier arancel a
-- mano. Hasta acá la tabla era append-only literal (migración 21): un
-- precio mal cargado —$ 800 en vez de $ 800.000, una cobertura en la
-- obra social equivocada— no tenía arreglo desde la app. La única
-- salida era abrir otra vigencia encima, y el error quedaba rigiendo
-- en el pasado para siempre.
--
-- Lo que NO se relaja es lo que la regla protegía de verdad: que un
-- presupuesto emitido se pueda defender frente al paciente.
--
--   · El documento no cambia. `presupuesto_items` guarda su copia del
--     precio; corregir o borrar el arancel que citó no lo toca.
--   · Nada se pierde. Cada alta, corrección y baja queda en
--     `aranceles_cambios`, append-only, con el antes, el después, quién,
--     cuándo, desde dónde (a mano, aumento, Excel…) y el motivo. Un
--     arancel borrado sigue identificable por su id.
--   · Las fechas siguen siendo honestas. Una vigencia no puede empezar
--     después ni terminar antes de un presupuesto emitido que la cita,
--     y nunca rigen dos precios el mismo día.
--   · Un AUMENTO sigue siendo una vigencia nueva. Corregir es para
--     arreglar un error de carga: si el precio cambió porque cambió, se
--     abre una vigencia y el precio viejo queda en el historial.
--
-- Corregir y borrar van por RPC (`corregir_arancel`, `borrar_arancel`):
-- desde el navegador la tabla sigue cerrada, igual que antes, porque
-- las dos operaciones tienen que acomodar a la vigencia vecina en la
-- misma transacción y exigir el motivo cuando el arancel ya se usó.
-- ════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- 1) Registro de cambios
-- ─────────────────────────────────────────────────────────────

create table if not exists aranceles_cambios (
  id              uuid primary key default gen_random_uuid(),
  -- Sin FK a propósito: el registro de un arancel borrado es justamente
  -- lo que tiene que sobrevivir al borrado.
  arancel_id      uuid not null,
  prestacion_id   uuid not null,
  obra_social_id  uuid,                    -- null = particular
  accion          text not null check (accion in ('alta', 'edicion', 'baja')),
  -- Por dónde entró: vigencia | aumento | excel | correccion | baja | directo
  origen          text not null,
  motivo          text,
  antes           jsonb,                   -- null en un alta
  despues         jsonb,                   -- null en una baja
  autor_id        uuid,
  autor_nombre    text not null,
  -- `clock_timestamp()` y no `now()`: una corrección escribe dos o tres
  -- filas en la misma transacción, y `now()` les daría la misma hora.
  created_at      timestamptz not null default clock_timestamp()
);

create index if not exists aranceles_cambios_arancel_idx
  on aranceles_cambios (arancel_id, created_at desc);
create index if not exists aranceles_cambios_celda_idx
  on aranceles_cambios (prestacion_id, obra_social_id, created_at desc);

comment on table aranceles_cambios is
  'Historial append-only de cada alta, corrección y baja de un arancel. '
  'Lo escribe sólo el trigger trg_arancel_cambios.';

alter table aranceles_cambios enable row level security;

drop policy if exists "equipo lee" on aranceles_cambios;
create policy "equipo lee" on aranceles_cambios for select using (auth.uid() is not null);
-- Sin policy de INSERT, UPDATE ni DELETE: escribe el trigger, que es
-- security definer, y nadie edita ni borra el registro.

create or replace function guard_cambio_inmutable() returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'El registro de cambios de aranceles es append-only';
end $$;

drop trigger if exists trg_cambio_inmutable on aranceles_cambios;
create trigger trg_cambio_inmutable
  before update or delete on aranceles_cambios
  for each row execute function guard_cambio_inmutable();

-- ─────────────────────────────────────────────────────────────
-- Origen y motivo viajan por dos settings de la transacción
-- (`smilelab.origen`, `smilelab.motivo`). Así el trigger es el único
-- que escribe el registro, y cada RPC sólo tiene que decir quién es.
--
-- Las RPC de arriba (aumento, Excel, corrección, baja) marcan siempre.
-- `nueva_vigencia` marca sólo si nadie lo hizo antes: el aumento masivo
-- y el Excel la llaman por dentro, y el cambio tiene que figurar como
-- aumento o como Excel, no como una vigencia suelta.
-- ─────────────────────────────────────────────────────────────

create or replace function marcar_origen_arancel(
  p_origen  text,
  p_motivo  text default null,
  p_pisar   boolean default true
) returns void
language plpgsql
set search_path = public
as $$
begin
  if p_pisar or coalesce(current_setting('smilelab.origen', true), '') = '' then
    perform set_config('smilelab.origen', p_origen, true);
    perform set_config('smilelab.motivo', coalesce(nullif(btrim(p_motivo), ''), ''), true);
  end if;
end $$;

revoke execute on function marcar_origen_arancel(text, text, boolean) from public, anon, authenticated;

create or replace function registrar_cambio_arancel() returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_origen text := coalesce(nullif(current_setting('smilelab.origen', true), ''), 'directo');
  v_motivo text := nullif(current_setting('smilelab.motivo', true), '');
begin
  if tg_op = 'INSERT' then
    insert into aranceles_cambios (arancel_id, prestacion_id, obra_social_id, accion,
                                   origen, motivo, antes, despues, autor_id, autor_nombre)
    values (new.id, new.prestacion_id, new.obra_social_id, 'alta',
            v_origen, v_motivo, null, to_jsonb(new), auth.uid(), actor_nombre());
  elsif tg_op = 'UPDATE' then
    if new is distinct from old then
      insert into aranceles_cambios (arancel_id, prestacion_id, obra_social_id, accion,
                                     origen, motivo, antes, despues, autor_id, autor_nombre)
      values (new.id, new.prestacion_id, new.obra_social_id, 'edicion',
              v_origen, v_motivo, to_jsonb(old), to_jsonb(new), auth.uid(), actor_nombre());
    end if;
  else
    insert into aranceles_cambios (arancel_id, prestacion_id, obra_social_id, accion,
                                   origen, motivo, antes, despues, autor_id, autor_nombre)
    values (old.id, old.prestacion_id, old.obra_social_id, 'baja',
            v_origen, v_motivo, to_jsonb(old), null, auth.uid(), actor_nombre());
  end if;
  return null;
end $$;

drop trigger if exists trg_arancel_cambios on aranceles;
create trigger trg_arancel_cambios
  after insert or update or delete on aranceles
  for each row execute function registrar_cambio_arancel();

-- ─────────────────────────────────────────────────────────────
-- 2) Marca de corrección
--
-- El banner de precio desactualizado del detalle decide por IDENTIDAD:
-- «el arancel que citó el ítem ya no es el que rige». Con la
-- corrección, el arancel citado puede seguir siendo el mismo y decir
-- otro número. `corregido_at` es lo que le avisa al detalle que eso
-- pasó después de emitido el presupuesto.
-- ─────────────────────────────────────────────────────────────

alter table aranceles add column if not exists corregido_at timestamptz;

-- ─────────────────────────────────────────────────────────────
-- 3) El ítem cita un arancel; no lo encadena
--
-- `presupuesto_items.arancel_id` era una FK con `on delete set null`.
-- Con aranceles borrables eso no sirve: el `set null` es un UPDATE
-- sobre el ítem de un presupuesto emitido —`guard_item_emitido` lo
-- rechaza, con razón— y aunque pasara, borraría la única pista de qué
-- precio citó el documento.
--
-- La referencia pasa a ser una cita: el id queda en el ítem para
-- siempre, y si el arancel se borró, su contenido sigue en
-- `aranceles_cambios` bajo ese mismo id. Lo que la FK garantizaba al
-- emitir —que el arancel exista— lo garantiza ahora un trigger.
-- ─────────────────────────────────────────────────────────────

alter table presupuesto_items drop constraint if exists presupuesto_items_arancel_id_fkey;

create or replace function guard_item_arancel() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.arancel_id is not null
     and (tg_op = 'INSERT' or new.arancel_id is distinct from old.arancel_id)
     and not exists (select 1 from aranceles where id = new.arancel_id)
  then
    raise exception
      'El arancel de «%» se borró mientras armabas el presupuesto: volvé a elegir la prestación',
      new.nombre;
  end if;
  return new;
end $$;

drop trigger if exists trg_item_arancel on presupuesto_items;
create trigger trg_item_arancel
  before insert or update on presupuesto_items
  for each row execute function guard_item_arancel();

-- ─────────────────────────────────────────────────────────────
-- 4) Guardas
-- ─────────────────────────────────────────────────────────────

-- Borrar deja de estar prohibido para las RPC (que corren como
-- `postgres`) y sigue prohibido desde una sesión del equipo: sin policy
-- de DELETE y con esta guarda, que además cubre un DELETE con la
-- service role key que no pase por `borrar_arancel()`… salvo que lo
-- haga a propósito el código del servidor.
create or replace function guard_arancel_no_delete() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('service_role', 'supabase_admin', 'postgres') then
    return old;
  end if;
  raise exception
    'Los aranceles se borran desde la grilla de aranceles, que pide el motivo y acomoda la vigencia anterior';
end $$;

-- `guard_arancel_inmutable` (migración 21) queda como está: desde una
-- sesión del equipo, ninguna columna se edita a mano. La corrección
-- entra por `corregir_arancel()`.

-- Una vigencia tiene que cubrir los días de los presupuestos emitidos
-- que la citan: ni terminar antes (migración 21), ni empezar después.
-- Moverle el «desde» hacia adelante dejaría a un documento citando un
-- precio que, según la base, todavía no regía el día que se emitió.
--
-- Se mira sólo el borde que SE ACHICA. El wizard deja elegir la fecha de
-- emisión, así que un presupuesto cargado hoy con fecha de la semana
-- pasada cita el arancel de hoy, que puede haber empezado después: esa
-- incoherencia ya existe y no la crea nadie que cierre o corrija la
-- vigencia sin tocar su inicio. Mirar los dos bordes siempre bloqueaba
-- para siempre el aumento, la importación y el borrado de esa celda.
create or replace function guard_arancel_cierre_valido() returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_primera date;
  v_ultima  date;
  v_achica_fin    boolean;
  v_atrasa_inicio boolean;
begin
  if tg_op = 'INSERT' then
    -- Un arancel recién creado no puede estar citado por nadie.
    return new;
  end if;

  v_achica_fin := new.vigente_hasta is not null
                  and (old.vigente_hasta is null or new.vigente_hasta < old.vigente_hasta);
  v_atrasa_inicio := new.vigente_desde > old.vigente_desde;

  if not v_achica_fin and not v_atrasa_inicio then
    return new;
  end if;

  select min(p.fecha_emision), max(p.fecha_emision) into v_primera, v_ultima
    from presupuesto_items i
    join presupuestos p on p.id = i.presupuesto_id
   where i.arancel_id = new.id
     and p.estado <> 'borrador';

  if v_achica_fin and v_ultima is not null and new.vigente_hasta < v_ultima then
    raise exception
      'Ese arancel se citó en un presupuesto emitido el %: no se puede cerrar antes de esa fecha',
      to_char(v_ultima, 'DD/MM/YYYY');
  end if;

  if v_atrasa_inicio and v_primera is not null and new.vigente_desde > v_primera then
    raise exception
      'Ese arancel se citó en un presupuesto emitido el %: no puede empezar a regir después de esa fecha',
      to_char(v_primera, 'DD/MM/YYYY');
  end if;

  return new;
end $$;

-- ─────────────────────────────────────────────────────────────
-- 5) Las RPC existentes dicen de dónde viene el cambio
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

  perform marcar_origen_arancel('vigencia', null, false);

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
      (select to_char(vigente_desde, 'DD/MM/YYYY') from aranceles
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

  perform marcar_origen_arancel(
    'aumento',
    case when p_pct > 0 then 'Aumento masivo de ' else 'Baja masiva de ' end ||
    replace(trim(to_char(abs(p_pct), 'FM990D00')), '.', ',') || ' %'
  );

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
-- 6) Corregir un arancel
--
-- Monto, cobertura y fecha de inicio. La celda (prestación y obra
-- social) no se cambia: «este precio era de otra prestación» es borrar
-- acá y cargar allá, y así queda escrito como lo que fue.
--
-- La fecha de fin no se toca directamente: la define la vigencia que
-- sigue. Si se mueve el inicio y la anterior terminaba justo el día
-- previo, la anterior se acomoda para que no quede un hueco ni un día
-- con dos precios.
-- ─────────────────────────────────────────────────────────────

create or replace function usos_emitidos_arancel(p_arancel uuid) returns int
language sql stable
set search_path = public
as $$
  select count(distinct i.presupuesto_id)::int
    from presupuesto_items i
    join presupuestos p on p.id = i.presupuesto_id
   where i.arancel_id = p_arancel
     and p.estado <> 'borrador'
$$;

revoke execute on function usos_emitidos_arancel(uuid) from public, anon;
grant execute on function usos_emitidos_arancel(uuid) to authenticated;

create or replace function corregir_arancel(
  p_id         uuid,
  p_monto      numeric,
  p_cob_tipo   tipo_cobertura,
  p_cob_valor  numeric,
  p_desde      date,
  p_motivo     text default null
) returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_old       aranceles%rowtype;
  v_prev      aranceles%rowtype;
  v_usos      int;
  v_cambia_precio boolean;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  select * into v_old from aranceles where id = p_id for update;
  if not found then
    raise exception 'Ese arancel ya no existe: alguien lo borró mientras lo mirabas';
  end if;

  if p_monto is null or p_monto < 0 then
    raise exception 'El monto no puede ser negativo';
  end if;
  if p_desde is null then
    raise exception 'Falta la fecha desde la que rige';
  end if;

  v_cambia_precio := p_monto is distinct from v_old.monto
                  or p_cob_tipo is distinct from v_old.cobertura_tipo
                  or p_cob_valor is distinct from v_old.cobertura_valor;

  if not v_cambia_precio and p_desde = v_old.vigente_desde then
    return p_id;   -- No hay nada que corregir.
  end if;

  v_usos := usos_emitidos_arancel(p_id);
  if v_usos > 0 and coalesce(btrim(p_motivo), '') = '' then
    raise exception
      'Ese arancel ya se usó en % presupuesto(s) emitido(s): contá en una línea por qué lo corregís',
      v_usos;
  end if;

  perform marcar_origen_arancel('correccion', p_motivo);

  if v_old.vigente_hasta is not null and p_desde > v_old.vigente_hasta then
    raise exception
      'Esa vigencia termina el %: no puede empezar después',
      to_char(v_old.vigente_hasta, 'DD/MM/YYYY');
  end if;

  -- La vecina de atrás, si terminaba justo antes: es la que se acomoda.
  select * into v_prev
    from aranceles
   where prestacion_id = v_old.prestacion_id
     and obra_social_id is not distinct from v_old.obra_social_id
     and vigente_hasta = v_old.vigente_desde - 1
   for update;

  if p_desde <> v_old.vigente_desde and v_prev.id is not null then
    if p_desde - 1 < v_prev.vigente_desde then
      raise exception
        'La vigencia anterior arranca el %: ésta no puede empezar antes. Si la querés reemplazar, borrala primero',
        to_char(v_prev.vigente_desde, 'DD/MM/YYYY');
    end if;

    -- El orden importa para la guarda de solapamiento: se achica
    -- primero la que pierde días y después crece la otra.
    if p_desde < v_old.vigente_desde then
      update aranceles set vigente_hasta = p_desde - 1 where id = v_prev.id;
    end if;
  end if;

  update aranceles
     set monto           = p_monto,
         cobertura_tipo  = p_cob_tipo,
         cobertura_valor = p_cob_valor,
         vigente_desde   = p_desde,
         corregido_at    = case when v_cambia_precio then now() else corregido_at end
   where id = p_id;

  if p_desde > v_old.vigente_desde and v_prev.id is not null then
    update aranceles set vigente_hasta = p_desde - 1 where id = v_prev.id;
  end if;

  return p_id;
end $$;

revoke execute on function corregir_arancel(uuid, numeric, tipo_cobertura, numeric, date, text) from public, anon;
grant execute on function corregir_arancel(uuid, numeric, tipo_cobertura, numeric, date, text) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 7) Borrar un arancel
--
-- Si la vigencia anterior terminaba justo el día previo, hereda el
-- tramo del arancel borrado: borrar el aumento de octubre deja rigiendo
-- el precio de septiembre, que es lo que se quiere al deshacer un
-- error de carga. Sin vecina anterior, la celda queda sin precio en
-- esos días.
--
-- Devuelve el id de la vigencia que heredó el tramo, o null.
-- ─────────────────────────────────────────────────────────────

create or replace function borrar_arancel(
  p_id      uuid,
  p_motivo  text default null
) returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_old   aranceles%rowtype;
  v_prev  aranceles%rowtype;
  v_usos  int;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  select * into v_old from aranceles where id = p_id for update;
  if not found then
    raise exception 'Ese arancel ya no existe: alguien lo borró mientras lo mirabas';
  end if;

  v_usos := usos_emitidos_arancel(p_id);
  if v_usos > 0 and coalesce(btrim(p_motivo), '') = '' then
    raise exception
      'Ese arancel ya se usó en % presupuesto(s) emitido(s): contá en una línea por qué lo borrás',
      v_usos;
  end if;

  perform marcar_origen_arancel('baja', p_motivo);

  select * into v_prev
    from aranceles
   where prestacion_id = v_old.prestacion_id
     and obra_social_id is not distinct from v_old.obra_social_id
     and vigente_hasta = v_old.vigente_desde - 1
   for update;

  delete from aranceles where id = p_id;
  if not found then
    raise exception 'El arancel no se pudo borrar. Recargá la pantalla y probá de nuevo';
  end if;

  if v_prev.id is not null then
    update aranceles set vigente_hasta = v_old.vigente_hasta where id = v_prev.id;
  end if;

  return v_prev.id;
end $$;

revoke execute on function borrar_arancel(uuid, text) from public, anon;
grant execute on function borrar_arancel(uuid, text) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 8) Duplicar con un arancel citado que ya no existe
--
-- El duplicado re-cotiza cada ítem contra la obra social de SU arancel
-- (migración 09). Si ese arancel se borró, el `select … into` no
-- encontraba nada y dejaba la obra social en null: el ítem se
-- re-cotizaba como particular. La obra social sale ahora del registro
-- de cambios, y si tampoco está ahí, de la del presupuesto.
--
-- Y si no hay arancel vigente, el ítem conserva el precio del original
-- pero ya no puede citar un arancel borrado (`guard_item_arancel`).
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
  v_existe      boolean;
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
    v_existe := false;
    if v_it.arancel_id is not null then
      select a.obra_social_id into v_os_item from aranceles a where a.id = v_it.arancel_id;
      v_existe := found;
      if not v_existe then
        -- Arancel borrado: su obra social quedó en el registro.
        select c.obra_social_id into v_os_item
          from aranceles_cambios c
         where c.arancel_id = v_it.arancel_id
         order by c.created_at desc
         limit 1;
        if not found then
          v_os_item := v_orig.obra_social_id;
        end if;
      end if;
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
      v_arancel_id := case when v_existe then v_it.arancel_id end;
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

revoke execute on function duplicar_presupuesto(uuid) from public, anon;
grant execute on function duplicar_presupuesto(uuid) to authenticated;

comment on table aranceles is
  'Un precio nuevo es una fila nueva; la anterior se cierra (nueva_vigencia, '
  'aumento_masivo, importar_aranceles). Corregir o borrar un error de carga '
  'va por corregir_arancel() y borrar_arancel(), y queda en aranceles_cambios. '
  'Desde una sesión del equipo ninguna columna se edita a mano.';
