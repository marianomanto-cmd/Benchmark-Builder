-- ════════════════════════════════════════════════════════════════════
--  SMILE LAB · PRESUPUESTOS — BORRAR TODOS LOS DATOS DE PRUEBA
--
--  CÓMO: Supabase → SQL Editor → New query → pegar TODO → Run.
--
--  QUÉ BORRA: presupuestos, ítems, cuotas, historial, aranceles,
--  prestaciones, pacientes y obras sociales. TODO.
--
--  QUÉ CONSERVA: las fichas del equipo (`profesionales`) y los usuarios
--  de acceso, para no quedarte afuera de tu propia app.
--
--  ⚠️  NO SE PUEDE DESHACER. Corré esto sólo sobre datos de prueba.
--
--  Corre entero o no corre: si algo falla en el medio, la transacción
--  vuelve atrás y no queda nada a medias.
-- ════════════════════════════════════════════════════════════════════

begin;

-- ─────────────────────────────────────────────────────────────
-- Las guardas del producto impiden borrar a propósito: el historial es
-- append-only, los aranceles no se borran, las fichas del equipo no se
-- borran. Eso es correcto para la app y es justo lo que estorba acá,
-- así que se apagan por el rato que dura esta transacción y se vuelven
-- a prender antes del commit.
--
-- `session_replication_role = replica` apaga los triggers de usuario de
-- TODAS las tablas de una, incluidas las de las claves foráneas, y se
-- revierte solo al terminar la transacción.
-- ─────────────────────────────────────────────────────────────
set local session_replication_role = replica;

-- ─── Los presupuestos y todo lo que cuelga de ellos ──────────
delete from presupuesto_eventos;
delete from presupuesto_cuotas;
delete from presupuesto_items;
delete from presupuestos;

-- ─── El catálogo ────────────────────────────────────────────
delete from aranceles;
delete from prestacion_cuotas;
delete from prestaciones;
delete from pacientes;
delete from obras_sociales;

-- ─────────────────────────────────────────────────────────────
-- La numeración vuelve a empezar.
--
-- Sin esto el primer presupuesto real saldría 2026-0072, y el número
-- del documento es lo que el consultorio le dice al paciente por
-- teléfono. Las secuencias no son transaccionales: este `setval` queda
-- aplicado aunque después hagas rollback de lo demás.
-- ─────────────────────────────────────────────────────────────
select setval('presupuesto_seq', 1, false);

commit;

-- ─────────────────────────────────────────────────────────────
-- Qué quedó
-- ─────────────────────────────────────────────────────────────
select 'presupuestos'   as tabla, count(*) as filas from presupuestos
union all select 'presupuesto_items',   count(*) from presupuesto_items
union all select 'presupuesto_cuotas',  count(*) from presupuesto_cuotas
union all select 'presupuesto_eventos', count(*) from presupuesto_eventos
union all select 'aranceles',           count(*) from aranceles
union all select 'prestaciones',        count(*) from prestaciones
union all select 'prestacion_cuotas',   count(*) from prestacion_cuotas
union all select 'pacientes',           count(*) from pacientes
union all select 'obras_sociales',      count(*) from obras_sociales
union all select 'profesionales (SE CONSERVAN)', count(*) from profesionales
order by 1;

-- ─────────────────────────────────────────────────────────────
-- Lo que esto NO borra, y hay que hacer aparte si te molesta:
--
-- · Los PDF ya generados, que viven en Storage. Supabase → Storage →
--   bucket `presupuestos` → seleccionar todo → Delete. Igual quedan
--   huérfanos y no los sirve nadie, porque los presupuestos que los
--   citaban ya no existen.
--
-- · Los usuarios de acceso (Authentication → Users). Se conservan a
--   propósito, junto con las fichas del equipo: son con lo que entrás.
--   Si querés borrar alguno, hacelo desde la pantalla de Equipo de la
--   app, que además corta el acceso en GoTrue.
-- ─────────────────────────────────────────────────────────────
