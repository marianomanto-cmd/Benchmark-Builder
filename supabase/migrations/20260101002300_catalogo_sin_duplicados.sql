-- ════════════════════════════════════════════════════════════════════
-- Smile Lab · Presupuestos — 24 · Una obra social, una fila
--
-- `obras_sociales` tiene `unique (nombre, plan)`, y eso NO impide el
-- duplicado que importa: en Postgres dos NULL no son iguales, así que
-- un índice único sobre `(nombre, plan)` deja pasar dos filas con el
-- mismo nombre y el plan vacío. Verificado:
--
--     insert into obras_sociales (nombre) values ('OSDE Duplicada');
--     insert into obras_sociales (nombre) values ('OSDE Duplicada');
--     -- INSERT 0 1 · INSERT 0 1 → dos filas
--
--     insert into obras_sociales (nombre, plan) values ('OSDE', '210');
--     insert into obras_sociales (nombre, plan) values ('OSDE', '210');
--     -- la segunda sí rebota
--
-- Y la mayoría de las obras sociales de un consultorio no tienen plan.
--
-- Qué pasa cuando se duplica: los aranceles cuelgan de UNA de las dos
-- filas y los pacientes se reparten entre las dos. El que quedó del
-- lado sin aranceles se presupuesta como particular —con el precio de
-- lista completo— sin que nada avise. El paciente recibe un presupuesto
-- más caro del que le corresponde y el consultorio no tiene forma de
-- notarlo mirando la pantalla: las dos obras sociales se llaman igual.
--
-- Lo mismo con `prestaciones`: `codigo` es único pero acepta null, así
-- que dos «Limpieza (sola)» sin código conviven, el picker del wizard
-- muestra las dos y cada una tiene su propio precio.
--
-- Van sin distinguir mayúsculas porque estos nombres se tipean a mano
-- en la Biblioteca y en los mini-forms del wizard: «Sancor» y «SANCOR»
-- son la misma obra social, y dejarlas convivir es el mismo agujero con
-- otra ropa.
-- ════════════════════════════════════════════════════════════════════

-- Sin plan: el nombre solo es la identidad.
create unique index if not exists obras_sociales_nombre_sin_plan_key
  on obras_sociales (lower(nombre)) where plan is null;

-- Con plan: el par. El `unique (nombre, plan)` original ya cubre este
-- caso, pero no sin distinguir mayúsculas.
create unique index if not exists obras_sociales_nombre_plan_ci_key
  on obras_sociales (lower(nombre), lower(plan)) where plan is not null;

create unique index if not exists prestaciones_nombre_key
  on prestaciones (lower(nombre));

comment on index obras_sociales_nombre_sin_plan_key is
  'Dos NULL no son iguales en Postgres, así que unique (nombre, plan) no '
  'impide dos obras sociales con el mismo nombre y sin plan. Este índice sí.';
