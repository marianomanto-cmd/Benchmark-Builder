-- ════════════════════════════════════════════════════════════════════
-- Smile Lab · Presupuestos — 08 · Las guardas van en la base, no en la RPC
--
-- DOS AGUJEROS QUE CIERRA
--
-- La RLS de este proyecto es «autenticado = acceso», y PostgREST expone
-- un UPDATE por tabla. Cualquier cosa que sólo esté validada dentro de
-- una RPC se puede evitar mandando el UPDATE directo desde el navegador:
--
-- 1. `cambiar_estado` prohíbe volver a `borrador`, pero
--    `update presupuestos set estado='borrador'` pasaba igual. Y un
--    presupuesto en borrador tiene los ítems abiertos a edición otra
--    vez: es exactamente lo que la regla del snapshot prohíbe.
--
-- 2. `guard_arancel_inmutable` congelaba monto, cobertura y
--    `vigente_desde` de un arancel ya usado, pero no `prestacion_id` ni
--    `obra_social_id`. Se podía reapuntar un arancel usado a otra
--    prestación y quedaba mintiendo sobre la trazabilidad del
--    presupuesto que lo cita.
--
-- Los dos se arreglan donde no se pueden esquivar: en un trigger.
-- ════════════════════════════════════════════════════════════════════

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
