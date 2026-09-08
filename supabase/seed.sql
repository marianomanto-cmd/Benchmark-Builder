-- ════════════════════════════════════════════════════════════════════
-- Smile Lab · Presupuestos — Semilla de desarrollo
--
--   supabase db reset          (local)
--   psql "$DATABASE_URL" -f supabase/seed.sql
--
-- No crea presupuestos: el wizard es lo primero que hay que probar y
-- conviene que la Home arranque en su estado vacío (pantalla 03).
-- ════════════════════════════════════════════════════════════════════

-- ── Profesionales ────────────────────────────────────────────
insert into profesionales (nombre, matricula, especialidad) values
  ('Álvarez, María',   'MP 12.345', 'Odontología general'),
  ('Benítez, Tomás',   'MP 23.456', 'Endodoncia'),
  ('Cabral, Lucía',    'MP 34.567', 'Prótesis y rehabilitación')
on conflict do nothing;

-- ── Obras sociales ───────────────────────────────────────────
insert into obras_sociales (nombre, plan, notas) values
  ('Particular',  null, 'Fila testigo: el valor particular se carga con obra_social_id = null'),
  ('OSDE',        '210', null),
  ('OSDE',        '310', null),
  ('Apross',      null,  'Requiere autorización previa para prótesis'),
  ('Swiss Medical', 'SMG02', null),
  ('Galeno',      null, null),
  ('PAMI',        null, null)
on conflict (nombre, plan) do nothing;

-- La fila "Particular" existe sólo para que aparezca en listados de
-- referencia; los aranceles particulares van con obra_social_id null.
delete from obras_sociales where nombre = 'Particular';

-- ── Prestaciones ─────────────────────────────────────────────
insert into prestaciones (nombre, codigo, rubro, descripcion, vigencia_dias) values
  ('Consulta y diagnóstico',        '01.01', 'Diagnóstico', 'Examen clínico completo, fichado y plan de tratamiento.', 30),
  ('Radiografía periapical',        '01.02', 'Diagnóstico', 'Radiografía digital de una pieza.', 30),
  ('Obturación simple (una cara)',  '02.01', 'Operatoria',  'Restauración con composite fotocurable en una cara.', 30),
  ('Obturación compuesta (dos caras)', '02.02', 'Operatoria', 'Restauración con composite fotocurable en dos caras.', 30),
  ('Endodoncia unirradicular',      '03.01', 'Endodoncia',  'Tratamiento de conducto en pieza de un conducto, incluye obturación provisoria.', 60),
  ('Endodoncia multirradicular',    '03.02', 'Endodoncia',  'Tratamiento de conducto en molar, incluye obturación provisoria.', 60),
  ('Corona de porcelana',           '04.01', 'Prótesis',    'Corona cerámica sobre pieza natural. Incluye provisorio y cementado.', 60),
  ('Perno muñón colado',            '04.02', 'Prótesis',    'Perno intrarradicular colado, incluye toma de impresión.', 60),
  ('Implante unitario',             '05.01', 'Implantes',   'Implante de titanio, incluye cirugía. No incluye corona.', 90),
  ('Limpieza y profilaxis',         '06.01', 'Preventiva',  'Tartrectomía ultrasónica y pulido coronario.', 30),
  ('Extracción simple',             '07.01', 'Cirugía',     'Exodoncia de pieza erupcionada sin complicaciones.', 30),
  ('Extracción de tercer molar retenido', '07.02', 'Cirugía', 'Exodoncia quirúrgica con colgajo y osteotomía.', 60)
on conflict (codigo) do nothing;

-- ── Plantillas de condiciones de pago ────────────────────────
insert into prestacion_cuotas (prestacion_id, orden, porcentaje, etiqueta)
select p.id, 0, 50, 'al iniciar' from prestaciones p
 where p.codigo in ('03.01','03.02','04.01','04.02','05.01','07.02')
on conflict do nothing;

insert into prestacion_cuotas (prestacion_id, orden, porcentaje, etiqueta)
select p.id, 1, 50, 'última sesión' from prestaciones p
 where p.codigo in ('03.01','03.02','04.01','04.02','05.01','07.02')
on conflict do nothing;

-- ── Aranceles vigentes ───────────────────────────────────────
-- Valor particular (obra_social_id null) para todas las prestaciones.
insert into aranceles (prestacion_id, obra_social_id, monto, cobertura_tipo, cobertura_valor, vigente_desde)
select p.id, null, v.monto, 'ninguna', 0, current_date - 90
from prestaciones p
join (values
  ('01.01',  22000),
  ('01.02',  14000),
  ('02.01',  48000),
  ('02.02',  66000),
  ('03.01', 138000),
  ('03.02', 196000),
  ('04.01', 385000),
  ('04.02', 142000),
  ('05.01', 720000),
  ('06.01',  38000),
  ('07.01',  52000),
  ('07.02', 168000)
) as v(codigo, monto) on v.codigo = p.codigo
on conflict do nothing;

-- OSDE 210: cobertura porcentual sobre un arancel de convenio.
insert into aranceles (prestacion_id, obra_social_id, monto, cobertura_tipo, cobertura_valor, vigente_desde)
select p.id, os.id, v.monto, 'porcentaje', v.pct, current_date - 90
from prestaciones p
join obras_sociales os on os.nombre = 'OSDE' and os.plan = '210'
join (values
  ('01.01',  20000, 100),
  ('01.02',  13000, 100),
  ('02.01',  44000,  70),
  ('02.02',  60000,  70),
  ('03.01', 126000,  60),
  ('03.02', 178000,  60),
  ('04.01', 350000,  40),
  ('06.01',  35000, 100),
  ('07.01',  47000,  80)
) as v(codigo, monto, pct) on v.codigo = p.codigo
on conflict do nothing;

-- Apross: coberturas de monto fijo. Deja huecos a propósito
-- (prótesis, implantes) para poder probar el bloque "sin arancel".
insert into aranceles (prestacion_id, obra_social_id, monto, cobertura_tipo, cobertura_valor, vigente_desde)
select p.id, os.id, v.monto, 'monto', v.fijo, current_date - 60
from prestaciones p
join obras_sociales os on os.nombre = 'Apross' and os.plan is null
join (values
  ('01.01',  21000, 21000),
  ('02.01',  46000, 30000),
  ('03.01', 132000, 62000),
  ('06.01',  36000, 24000)
) as v(codigo, monto, fijo) on v.codigo = p.codigo
on conflict do nothing;

-- Una vigencia cerrada, para que el drawer de historial (pantalla 10)
-- tenga algo que mostrar desde el primer arranque.
insert into aranceles (prestacion_id, obra_social_id, monto, cobertura_tipo, cobertura_valor, vigente_desde, vigente_hasta)
select p.id, null, 42000, 'ninguna', 0, current_date - 240, current_date - 91
from prestaciones p where p.codigo = '02.01'
on conflict do nothing;

-- ── Pacientes ────────────────────────────────────────────────
insert into pacientes (nombre, dni, telefono, tiene_whatsapp, email, obra_social_id, nro_afiliado)
values
  ('Gómez, Renata',    '32.114.556', '+54 351 555-0134', true,  'renata.gomez@example.com',
   (select id from obras_sociales where nombre = 'OSDE' and plan = '210'), '61234567801'),
  ('Suárez, Martín',   '28.997.031', '+54 351 555-0192', true,  null,
   (select id from obras_sociales where nombre = 'Apross'), 'AP-884120'),
  ('Iriarte, Camila',  '41.203.778', '+54 351 555-0177', true,  'cami.iriarte@example.com', null, null),
  ('Pereyra, Osvaldo', '14.556.220', null,               false, null,
   (select id from obras_sociales where nombre = 'PAMI'), 'PAMI-9931204')
on conflict do nothing;
