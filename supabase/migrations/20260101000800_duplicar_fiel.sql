-- ════════════════════════════════════════════════════════════════════
-- Smile Lab · Presupuestos — 09 · Duplicar fiel al original
--
-- DOS ERRORES QUE ARREGLA
--
-- 1. Las cuotas del duplicado se redondeaban una por una, sin que
--    ninguna absorbiera el resto: la suma de `presupuesto_cuotas` podía
--    no dar `total_a_cargo`. Con 3 cuotas de 33,33 % sobre $ 100.000 el
--    duplicado le pedía al paciente $ 99.999. `crear_presupuesto` ya lo
--    hacía bien; esta función se había quedado atrás.
--
-- 2. Cada ítem se re-cotizaba contra la obra social DEL PRESUPUESTO.
--    Pero el paso 2 del wizard permite cargar un ítem «con valor
--    particular» dentro de un presupuesto con obra social —es la salida
--    que se ofrece cuando esa prestación no tiene arancel de convenio—.
--    Al duplicar, ese ítem pasaba a cotizarse con el arancel de la obra
--    social (o se quedaba con el precio viejo si no había), mientras el
--    historial afirmaba «con los valores vigentes al …». Ahora cada
--    ítem se re-cotiza contra la MISMA obra social con la que se cargó,
--    que es la del arancel que citó en su momento.
-- ════════════════════════════════════════════════════════════════════

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
    -- Con qué obra social se cotizó este ítem. Un ítem cargado «con
    -- valor particular» dentro de un presupuesto con obra social citó
    -- un arancel particular: se lo vuelve a cotizar como particular.
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
      -- Sin vigencia hoy: el documento nuevo hereda el snapshot viejo.
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

  -- Cuotas: mismo reparto que crear_presupuesto — la última absorbe el
  -- redondeo para que la suma cierre exacta contra el total a cargo.
  select count(*) into v_cuotas_n from presupuesto_cuotas where presupuesto_id = p_id;
  if v_cuotas_n > 0 then
    v_orden := 0;
    for v_cuota in
      select etiqueta, porcentaje from presupuesto_cuotas
       where presupuesto_id = p_id order by orden
    loop
      if v_orden = v_cuotas_n - 1 then
        v_cuota_monto := v_total_cargo - v_acum;
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
