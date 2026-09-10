-- ════════════════════════════════════════════════════════════════════
-- Smile Lab · Presupuestos — 20 · Un alta, un documento
--
-- El agujero: `crear_presupuesto()` commitea en Postgres y DESPUÉS la
-- respuesta viaja de vuelta. Si el enlace se corta en el medio —Vercel
-- pierde la conexión con Supabase, el celular cambia de antena— la
-- server action entra por el `catch` y el wizard muestra:
--
--     «No se pudo hablar con el servidor. Probá "Reintentar":
--      lo cargado sigue acá y no se emitió nada.»
--
-- Y eso es MENTIRA: el presupuesto está emitido, numerado y en la base.
-- El «Reintentar» que la app misma ofrece emite un segundo documento,
-- con otro número, por el mismo tratamiento. El consultorio termina con
-- 2026-0341 y 2026-0342 idénticos y no sabe cuál mandó.
--
-- La solución es que el alta la identifique el CLIENTE, no el servidor:
-- el wizard genera una clave al empezar a cargar, la guarda en el
-- borrador (sobrevive la recarga) y la manda con el payload. Si esa
-- clave ya emitió un presupuesto, la RPC devuelve el que ya existe en
-- lugar de crear otro. Reintentar deja de ser peligroso.
--
-- Es la misma idea que una clave de idempotencia en un cobro: la única
-- forma de que un reintento sea seguro es que el que reintenta pueda
-- decir «esto es el mismo pedido, no uno nuevo».
-- ════════════════════════════════════════════════════════════════════

alter table presupuestos add column if not exists clave_alta uuid;

comment on column presupuestos.clave_alta is
  'Clave de idempotencia del alta, generada por el wizard. Permite que un '
  'reintento después de una respuesta perdida devuelva el mismo documento '
  'en lugar de emitir uno nuevo.';

-- Parcial: los presupuestos viejos y los duplicados no tienen clave, y
-- muchos `null` no chocan entre sí en un índice único de todos modos.
create unique index if not exists presupuestos_clave_alta_key
  on presupuestos (clave_alta) where clave_alta is not null;

-- ─────────────────────────────────────────────────────────────
-- La clave es parte de la identidad del alta: una vez emitido, no se
-- toca. Sin esto, un PATCH podía reapuntar la clave de un documento a
-- otro y hacer que el próximo alta devolviera el presupuesto equivocado.
-- ─────────────────────────────────────────────────────────────

create or replace function guard_presupuesto_emitido() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.estado = 'borrador' then
    return new;
  end if;

  if new.estado = 'borrador' then
    raise exception
      'Un presupuesto emitido no vuelve a borrador: duplicalo en lugar de reabrirlo';
  end if;

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
     or new.clave_alta         is distinct from old.clave_alta
  then
    raise exception
      'Los valores de un presupuesto emitido no se editan: duplicalo con los valores de hoy';
  end if;

  return new;
end $$;

-- ─────────────────────────────────────────────────────────────
-- El alta, ahora idempotente
--
-- Lo único que cambia respecto de la migración 12 son las tres piezas
-- de la clave: la lectura antes de insertar, la columna en el insert, y
-- el `exception` que resuelve la carrera de dos pedidos simultáneos con
-- la misma clave (el segundo choca contra el índice único, deshace su
-- inserción parcial y devuelve el documento que ganó).
-- ─────────────────────────────────────────────────────────────

create or replace function crear_presupuesto(p_payload jsonb)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_id            uuid;
  v_numero        text;
  v_clave         uuid;
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

  -- ── Idempotencia: ¿esta alta ya emitió un documento? ──
  v_clave := nullif(p_payload ->> 'clave_alta', '')::uuid;
  if v_clave is not null then
    select id into v_id from presupuestos where clave_alta = v_clave;
    if v_id is not null then
      return v_id;
    end if;
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

  v_os_id := nullif(p_payload ->> 'obra_social_id', '')::uuid;
  select nombre || coalesce(' ' || plan, '') into v_os_nombre
    from obras_sociales where id = v_os_id;

  insert into presupuestos (
    paciente_id, profesional_id, obra_social_id, obra_social_nombre,
    paciente_nombre, paciente_dni, paciente_telefono, paciente_afiliado,
    profesional_nombre, profesional_matricula,
    fecha_emision, valido_hasta, observaciones, nota_interna,
    estado, created_by, clave_alta
  ) values (
    v_pac.id, v_prof.id, v_os_id, v_os_nombre,
    v_pac.nombre, v_pac.dni, v_pac.telefono, v_pac.nro_afiliado,
    v_prof.nombre, v_prof.matricula,
    coalesce((p_payload ->> 'fecha_emision')::date, current_date),
    coalesce((p_payload ->> 'valido_hasta')::date, current_date + 30),
    nullif(p_payload ->> 'observaciones', ''),
    nullif(p_payload ->> 'nota_interna', ''),
    'borrador', auth.uid(), v_clave
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

exception
  -- Dos pedidos con la misma clave a la vez: el que pierde la carrera
  -- llega acá, su inserción parcial se deshace sola con la subtransacción
  -- y devuelve el documento del que ganó. Cualquier otra violación de
  -- unicidad sigue su camino de siempre.
  when unique_violation then
    if v_clave is null then raise; end if;
    select id into v_id from presupuestos where clave_alta = v_clave;
    if v_id is null then raise; end if;
    return v_id;
end $$;

revoke execute on function crear_presupuesto(jsonb) from public, anon;
grant execute on function crear_presupuesto(jsonb) to authenticated;
