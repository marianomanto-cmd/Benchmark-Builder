-- ════════════════════════════════════════════════════════════════════
-- Smile Lab · Presupuestos — 07 · «Vigente» es una fecha, no un null
--
-- BUG QUE ARREGLA
-- «Vigente hoy» se resolvía como `vigente_hasta is null`. Eso alcanza
-- mientras nadie programe un aumento hacia adelante, pero el form de
-- nueva vigencia y el aumento masivo permiten elegir una fecha futura
-- —es su razón de ser: dejar cargado el aumento de octubre en
-- septiembre—.
--
-- Al programarlo, `nueva_vigencia` cierra la fila actual con
-- `vigente_hasta = desde - 1 día` e inserta la nueva con
-- `vigente_hasta = null`. Desde ese instante la fila FUTURA era la
-- única con `vigente_hasta is null`, así que el wizard, el banner de
-- precio desactualizado y `duplicar_presupuesto` empezaban a usar un
-- precio que todavía no rige. El consultorio le cotizaba a un paciente
-- el aumento de octubre en septiembre.
--
-- Vigente hoy pasa a ser lo que siempre significó:
--   vigente_desde <= hoy  AND  (vigente_hasta is null OR vigente_hasta >= hoy)
-- ════════════════════════════════════════════════════════════════════

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

drop view if exists aranceles_vigentes;

create view aranceles_vigentes with (security_invoker = true) as
select a.*, p.nombre as prestacion, p.codigo, p.rubro,
       coalesce(os.nombre || coalesce(' ' || os.plan, ''), 'Particular') as obra_social,
       (select count(*) from presupuesto_items pi where pi.arancel_id = a.id) as usos
  from aranceles a
  join prestaciones p on p.id = a.prestacion_id
  left join obras_sociales os on os.id = a.obra_social_id
 where a.vigente_desde <= current_date
   and (a.vigente_hasta is null or a.vigente_hasta >= current_date);

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
      -- Los valores de HOY: una vigencia programada para más adelante
      -- no se cotiza todavía.
      select * into v_ar
        from arancel_vigente(v_it.prestacion_id, v_orig.obra_social_id);
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

  insert into presupuesto_cuotas (presupuesto_id, orden, etiqueta, porcentaje, monto)
  select v_new, orden, etiqueta, porcentaje,
         round(v_total_cargo * (coalesce(porcentaje, 0) / 100.0))
    from presupuesto_cuotas where presupuesto_id = p_id order by orden;

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
