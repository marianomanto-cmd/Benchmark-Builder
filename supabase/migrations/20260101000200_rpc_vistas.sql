-- ════════════════════════════════════════════════════════════════════
-- Smile Lab · Presupuestos — 03 · RPC y vistas
--
-- Todo lo que tiene que ser atómico vive acá: cerrar una vigencia y
-- abrir la siguiente, y congelar un presupuesto completo (cabecera +
-- ítems + cuotas + evento) en una sola transacción.
-- ════════════════════════════════════════════════════════════════════

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
  -- El least/greatest acota la cobertura a [0, monto]. Un override a mano
  -- puede tipear 150 % o un monto fijo mayor al arancel; sin este tope el
  -- a-cargo saldría negativo.
  select greatest(0::numeric, least(
    case p_tipo
      when 'porcentaje' then round(p_monto * (coalesce(p_valor, 0) / 100.0))
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
      round(r.monto * (1 + p_pct / 100.0)),
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
          'Presupuesto ' || v_numero || ' creado con ' || v_orden || ' condición(es) de pago y ' ||
          jsonb_array_length(p_payload -> 'items') || ' prestación(es)',
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
    -- el contexto del paciente se refresca: puede haber cambiado de plan
    coalesce(pac.nombre, p.paciente_nombre),
    coalesce(pac.dni, p.paciente_dni),
    coalesce(pac.telefono, p.paciente_telefono),
    coalesce(pac.nro_afiliado, p.paciente_afiliado),
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
    v_ar := null;
    if v_it.prestacion_id is not null then
      select * into v_ar from aranceles
       where prestacion_id = v_it.prestacion_id
         and obra_social_id is not distinct from v_orig.obra_social_id
         and vigente_hasta is null
       limit 1;
    end if;

    if v_ar.id is not null then
      v_monto      := v_ar.monto;
      v_tipo       := v_ar.cobertura_tipo;
      v_valor      := v_ar.cobertura_valor;
      v_arancel_id := v_ar.id;
    else
      -- sin arancel vigente: el documento nuevo hereda el snapshot viejo
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

  -- Las condiciones de pago se recalculan sobre el nuevo total.
  insert into presupuesto_cuotas (presupuesto_id, orden, etiqueta, porcentaje, monto)
  select v_new, orden, etiqueta, porcentaje,
         round(v_total_cargo * (coalesce(porcentaje, 0) / 100.0))
    from presupuesto_cuotas where presupuesto_id = p_id order by orden;

  update presupuestos
     set subtotal = v_subtotal,
         total_cobertura = v_total_cob,
         total_a_cargo = v_total_cargo
   where id = v_new;

  -- Los overrides de cobertura NO se heredan: el duplicado toma los
  -- valores de hoy tal cual están en los aranceles. Queda dicho en el
  -- historial para que nadie descubra la diferencia por accidente.
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
  values (p_id, 'duplicado',
          'Se duplicó en ' || v_numero, auth.uid(), actor_nombre());

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
 where a.vigente_hasta is null;

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
