-- ════════════════════════════════════════════════════════════════════
-- Smile Lab · Presupuestos — 21 · Append-only en serio
--
-- AGENTS.md dice, sin condiciones:
--
--   «`aranceles` es append-only. Un cambio de precio inserta una fila
--    nueva y cierra la anterior. Nunca un `UPDATE` de monto o
--    cobertura.»
--
-- Lo que había implementado era la regla 2 —«un arancel USADO no se
-- edita»—, que es otra cosa. `guard_arancel_inmutable()` sólo levantaba
-- la excepción `if exists (select 1 from presupuesto_items where
-- arancel_id = old.id)`. Sobre una vigencia sin usar todavía —incluida
-- la que la grilla muestra como el precio de hoy— un PATCH desde el
-- navegador reescribía monto, cobertura y fechas en el lugar. Sin fila
-- nueva. Sin rastro. Exactamente lo que la regla prohíbe.
--
-- Y moviéndole `vigente_desde` hacia atrás quedaban DOS aranceles
-- rigiendo el mismo día para la misma celda. Verificado:
--
--     monto   | vigente_desde | vigente_hasta | rige_hoy
--   ----------+---------------+---------------+----------
--      1234.00| 2026-01-01    |               | t
--    720000.00| 2026-06-11    | 2027-02-28    | t
--
-- El índice `aranceles_una_vigente` no lo agarra: cubre la vigencia
-- ABIERTA, y acá el solapamiento es entre una abierta y una cerrada.
--
-- Se alcanza igual que los agujeros de la migración 18: PostgREST
-- expone un UPDATE por tabla y la policy del equipo deja escribir a
-- cualquiera con sesión, porque el consultorio comparte el catálogo.
-- ════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- 1) Un arancel no se edita. Punto.
--
-- Las escrituras legítimas entran por `nueva_vigencia()` y
-- `aumento_masivo()`, que son `security definer` y corren como
-- `postgres`: adentro de ellas `current_user` NO es `authenticated`.
-- Verificado antes de escribir esto — es de lo que depende que el
-- aumento masivo siga funcionando.
--
-- El SQL Editor del dashboard (`postgres`) queda afuera a propósito:
-- es la salida de emergencia del consultorio, igual que en la 18.
-- ─────────────────────────────────────────────────────────────

create or replace function guard_arancel_inmutable() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('service_role', 'supabase_admin', 'postgres') then
    return new;
  end if;

  -- Desde una sesión del equipo, ninguna columna. Un cambio de precio
  -- es una fila nueva; cerrar una vigencia es `nueva_vigencia()`.
  if new is distinct from old then
    raise exception
      'Los aranceles no se editan: un precio nuevo abre una vigencia nueva y cierra la anterior';
  end if;

  return new;
end $$;

-- ─────────────────────────────────────────────────────────────
-- 2) Dos precios no rigen el mismo día
--
-- Con la guarda de arriba el camino del UPDATE queda cerrado, pero el
-- INSERT sigue abierto para el equipo (y tiene que seguirlo: es como se
-- carga el primer arancel de una celda). Insertar a mano una vigencia
-- que pisa una existente deja la misma ambigüedad.
--
-- `arancel_vigente()` resuelve el empate con `order by vigente_desde
-- desc limit 1`, así que no explota: elige una. Y ese es el problema —
-- el consultorio cotiza un número y no tiene forma de saber que había
-- otro candidato.
-- ─────────────────────────────────────────────────────────────

create or replace function guard_arancel_solapado() returns trigger
language plpgsql
set search_path = public
as $$
declare v_otra aranceles%rowtype;
begin
  select * into v_otra
    from aranceles a
   where a.id <> new.id
     and a.prestacion_id = new.prestacion_id
     and a.obra_social_id is not distinct from new.obra_social_id
     -- Dos rangos se pisan si cada uno empieza antes de que termine el
     -- otro. `coalesce` al infinito cubre la vigencia abierta.
     and new.vigente_desde <= coalesce(a.vigente_hasta, 'infinity'::date)
     and a.vigente_desde   <= coalesce(new.vigente_hasta, 'infinity'::date)
   limit 1;

  if found then
    raise exception
      'Esa prestación ya tiene una vigencia entre el % y el % para esa obra social: no pueden regir dos precios el mismo día',
      to_char(v_otra.vigente_desde, 'DD/MM/YYYY'),
      coalesce(to_char(v_otra.vigente_hasta, 'DD/MM/YYYY'), 'hoy');
  end if;

  return new;
end $$;

drop trigger if exists trg_arancel_solapado on aranceles;

create trigger trg_arancel_solapado
  before insert or update on aranceles
  for each row execute function guard_arancel_solapado();

-- ─────────────────────────────────────────────────────────────
-- 3) Una vigencia no se cierra antes del presupuesto que la cita
--
-- El aumento masivo acepta una fecha «rige desde» en el pasado. Eso
-- puede ser legítimo —el aumento se decidió el 1° y se cargó el 10—,
-- así que no se prohíbe. Lo que no puede pasar es que el cierre caiga
-- ANTES de un presupuesto emitido que cita ese arancel: el documento
-- quedaría citando un precio que, según la base, ya no regía el día en
-- que se emitió.
--
-- El presupuesto en sí no cambia (lleva el snapshot). Lo que se pierde
-- es la capacidad de defenderlo: «este es el precio que regía ese día»
-- deja de ser cierto, y esa capacidad es el requisito no funcional más
-- importante del sistema.
-- ─────────────────────────────────────────────────────────────

create or replace function guard_arancel_cierre_valido() returns trigger
language plpgsql
set search_path = public
as $$
declare v_ultima date;
begin
  if new.vigente_hasta is null then
    return new;
  end if;

  select max(p.fecha_emision) into v_ultima
    from presupuesto_items i
    join presupuestos p on p.id = i.presupuesto_id
   where i.arancel_id = new.id
     and p.estado <> 'borrador';

  if v_ultima is not null and new.vigente_hasta < v_ultima then
    raise exception
      'Ese arancel se citó en un presupuesto emitido el %: no se puede cerrar antes de esa fecha',
      to_char(v_ultima, 'DD/MM/YYYY');
  end if;

  return new;
end $$;

drop trigger if exists trg_arancel_cierre_valido on aranceles;

create trigger trg_arancel_cierre_valido
  before insert or update on aranceles
  for each row execute function guard_arancel_cierre_valido();

-- El comentario de la RLS decía la regla a medias.
comment on table aranceles is
  'Append-only. Un precio nuevo es una fila nueva; la anterior se cierra. '
  'Ninguna columna se edita desde una sesión del equipo: las escrituras '
  'legítimas entran por nueva_vigencia() y aumento_masivo().';
