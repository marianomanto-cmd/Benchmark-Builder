-- ════════════════════════════════════════════════════════════════════
-- Smile Lab · Presupuestos — 12 · Alta: historial honesto y cuotas válidas
--
-- DOS ARREGLOS
--
-- 1. El evento «creado» reutilizaba `v_orden` para contar cuotas. Como
--    ese contador venía de la vuelta de los ítems, un presupuesto sin
--    condiciones de pago quedaba registrado para siempre como «creado
--    con 2 condición(es) de pago y 2 prestación(es)». El historial es
--    append-only: una vez escrito, esa línea no se corrige.
--
-- 2. Unos porcentajes que no suman 100 dejaban la última cuota en
--    negativo. Desde que existe el check de `presupuesto_cuotas`, eso
--    aborta la emisión entera con un error de Postgres sin traducir.
--    Ahora se valida antes, con un mensaje que se entiende.
-- ════════════════════════════════════════════════════════════════════

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

revoke execute on function crear_presupuesto(jsonb) from public, anon;
grant execute on function crear_presupuesto(jsonb) to authenticated;
