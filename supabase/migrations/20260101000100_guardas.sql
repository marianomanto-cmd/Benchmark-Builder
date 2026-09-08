-- ════════════════════════════════════════════════════════════════════
-- Smile Lab · Presupuestos — 02 · Numeración y guardas de la regla
--
-- Estas guardas son la razón por la que el consultorio puede defender
-- un presupuesto viejo frente a un paciente. No relajarlas.
-- ════════════════════════════════════════════════════════════════════

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
       or new.vigente_desde is distinct from old.vigente_desde then
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
  if new.estado is distinct from old.estado then
    new.estado_desde := now();
  end if;
  return new;
end $$;

create trigger trg_presupuesto_estado_desde
  before update on presupuestos
  for each row execute function touch_estado_desde();
