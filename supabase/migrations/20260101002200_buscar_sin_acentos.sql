-- ════════════════════════════════════════════════════════════════════
-- Smile Lab · Presupuestos — 23 · Buscar como escribe la gente
--
-- La búsqueda de la home, la del pipeline y la del picker de pacientes
-- del wizard usan `ilike '%q%'`, que en Postgres distingue acentos. Los
-- pacientes se guardan «Apellido, Nombre». Sobre los datos reales:
--
--     q = "Gómez"          -> 31 presupuestos
--     q = "Gomez"          ->  0            ← el mismo apellido sin tilde
--     q = "Gómez, Renata"  ->  0            ← copiado y pegado del listado
--
-- Dos causas encimadas:
--
-- 1. El acento. Nadie escribe «Gómez» con tilde en un buscador, y la
--    mitad de los pacientes de una agenda argentina lleva uno.
--
-- 2. La coma. `terminoSeguro()` la reemplaza por un espacio —tiene que
--    hacerlo, porque PostgREST arma el `or=` con comas— así que el
--    término queda «Gómez Renata» y se busca como UNA subcadena
--    literal, que no existe: lo guardado dice «Gómez, Renata».
--
-- Y lo que pasa después es lo caro: el picker del wizard no encuentra a
-- la paciente, ofrece «Crear paciente», y la agenda termina con dos
-- «Gómez, Renata» y el historial partido entre las dos.
--
-- La solución es una columna que ya venga normalizada —sin acentos, en
-- minúsculas— y buscar palabra por palabra contra ella.
-- ════════════════════════════════════════════════════════════════════

create extension if not exists unaccent;
create extension if not exists pg_trgm;

-- ─────────────────────────────────────────────────────────────
-- `unaccent()` es STABLE, no IMMUTABLE: depende del diccionario, que en
-- teoría se puede cambiar. Una columna generada y un índice exigen
-- IMMUTABLE, así que se envuelve. Es el envoltorio de siempre, y es
-- seguro mientras nadie toque el diccionario `unaccent`.
-- ─────────────────────────────────────────────────────────────

create or replace function sin_acentos(t text) returns text
language sql immutable strict parallel safe
set search_path = public, extensions
as $$ select lower(unaccent(t)) $$;

comment on function sin_acentos(text) is
  'Texto listo para buscar: sin acentos y en minúsculas. Tiene que dar lo '
  'mismo que normalizar() en lib/formato.ts — es el par TS/SQL de la búsqueda.';

-- ─────────────────────────────────────────────────────────────
-- Pacientes: es el picker del wizard, donde el costo de no encontrar
-- es una ficha duplicada.
-- ─────────────────────────────────────────────────────────────

alter table pacientes
  add column if not exists busqueda text
  generated always as (
    sin_acentos(
      coalesce(nombre, '') || ' ' ||
      coalesce(dni, '') || ' ' ||
      coalesce(nro_afiliado, '')
    )
  ) stored;

create index if not exists pacientes_busqueda_idx
  on pacientes using gin (busqueda gin_trgm_ops);

-- ─────────────────────────────────────────────────────────────
-- Presupuestos: home y pipeline. Todo lo que se busca vive en el
-- snapshot de la propia fila, salvo la prestación principal, que la
-- resuelve la vista.
-- ─────────────────────────────────────────────────────────────

alter table presupuestos
  add column if not exists busqueda text
  generated always as (
    sin_acentos(
      coalesce(numero, '') || ' ' ||
      coalesce(paciente_nombre, '') || ' ' ||
      coalesce(paciente_dni, '') || ' ' ||
      coalesce(paciente_afiliado, '') || ' ' ||
      coalesce(obra_social_nombre, '') || ' ' ||
      coalesce(profesional_nombre, '')
    )
  ) stored;

create index if not exists presupuestos_busqueda_idx
  on presupuestos using gin (busqueda gin_trgm_ops);

-- ─────────────────────────────────────────────────────────────
-- La vista suma la prestación principal a lo buscable.
--
-- Se enumeran las columnas en vez de usar `p.*` para conservar el orden
-- que la vista ya tenía: `create or replace view` sólo deja agregar
-- columnas AL FINAL, y con `p.*` las nuevas de `presupuestos` se
-- colarían en el medio y el reemplazo fallaría.
-- ─────────────────────────────────────────────────────────────

create or replace view presupuestos_listado with (security_invoker = true) as
select
  p.id, p.numero, p.paciente_id, p.profesional_id, p.obra_social_id,
  p.obra_social_nombre, p.paciente_nombre, p.paciente_dni, p.paciente_telefono,
  p.paciente_afiliado, p.profesional_nombre, p.profesional_matricula,
  p.fecha_emision, p.valido_hasta, p.subtotal, p.total_cobertura, p.total_a_cargo,
  p.observaciones, p.estado, p.estado_desde, p.motivo_perdida, p.motivo_perdida_nota,
  p.nota_interna, p.pdf_path, p.duplicado_de, p.created_at, p.updated_at, p.created_by,
  (select pi.nombre
     from presupuesto_items pi
    where pi.presupuesto_id = p.id
    order by pi.monto desc, pi.orden asc
    limit 1) as prestacion_principal,
  (select count(*) from presupuesto_items pi where pi.presupuesto_id = p.id) as items_count,
  greatest(0, extract(day from now() - p.estado_desde)::int) as dias_en_estado,
  -- Lo de la fila ya viene normalizado por la columna generada; la
  -- prestación se normaliza acá porque vive en otra tabla.
  p.busqueda || ' ' || coalesce(
    sin_acentos((select pi.nombre
                   from presupuesto_items pi
                  where pi.presupuesto_id = p.id
                  order by pi.monto desc, pi.orden asc
                  limit 1)), '') as busqueda
from presupuestos p;
