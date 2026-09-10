-- ════════════════════════════════════════════════════════════════════
-- Smile Lab · Presupuestos — 19 · Que las estadísticas no rellenen
--
-- Dos formas de rellenar que la cacería encontró en la migración 17, y
-- las dos tienen la misma raíz: convertir «no hay dato» en un número.
-- El propio proyecto ya tenía la regla escrita —«una tasa sin base no es
-- 0 %, es que no se puede calcular»— y acá estaba incumplida.
-- ════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- 1) La serie mensual arranca donde arranca el consultorio
--
-- `ventanaRango('todo')` devuelve el centinela 2000-01-01 para no tener
-- que preguntarle a la base cuál fue el primer presupuesto. Pero
-- `generate_series` lo tomaba literal: 321 meses, 311 de ellos vacíos,
-- dos gráficos con 26 años de línea plana en cero y la información real
-- comprimida en el último 3 % del ancho.
--
-- Ahora el piso de la serie es el mes del primer presupuesto emitido.
-- El centinela sigue sirviendo para lo que servía —«desde siempre»—
-- pero deja de dibujar un cuarto de siglo que no existió.
--
-- 2) El ticket de un mes sin presupuestos no es cero
--
-- `avg` sobre un mes vacío da NULL, y el `coalesce(…, 0)` lo convertía
-- en cero: la línea de «Cuánto sale un presupuesto» se desplomaba al
-- piso en cada mes sin actividad, como si el consultorio hubiera
-- regalado el trabajo. Los CONTEOS sí siguen en cero, que es correcto:
-- «se emitieron 0» es un dato; «el promedio fue 0» es mentira.
-- ─────────────────────────────────────────────────────────────

create or replace function stats_mensual(p_desde date, p_hasta date)
returns table (
  mes            date,
  emitidos       bigint,
  ganados        bigint,
  perdidos       bigint,
  monto_emitido  numeric,
  monto_ganado   numeric,
  ticket         numeric
)
language sql stable
set search_path = public
as $$
  with piso as (
    -- `null` cuando el consultorio todavía no emitió nada: ahí la serie
    -- no tiene que existir. `greatest()` ignora los nulls, así que con
    -- un `coalesce` al `p_desde` una base recién instalada devolvía los
    -- 321 meses igual — y un consultorio nuevo es justo el primero que
    -- abre esta pantalla. `generate_series(null, …)` no da filas.
    select case
             when s.primer_mes is null then null
             else greatest(date_trunc('month', p_desde)::date, s.primer_mes)
           end as desde
      from (
        select date_trunc('month', min(p.fecha_emision))::date as primer_mes
          from presupuestos p where p.estado <> 'borrador'
      ) s
  ),
  meses as (
    select generate_series(
      (select desde from piso),
      date_trunc('month', p_hasta)::date,
      interval '1 month'
    )::date as mes
  ),
  base as (
    select date_trunc('month', p.fecha_emision)::date as mes,
           p.estado, p.total_a_cargo
      from presupuestos p
     where p.estado <> 'borrador'
       and p.fecha_emision between p_desde and p_hasta
  )
  -- Los meses sin actividad DENTRO del rango van igual, en cero: un
  -- hueco en la serie se lee como «no pasó nada» sólo si el mes está
  -- dibujado. Lo que no va es el cuarto de siglo anterior al primer
  -- presupuesto del consultorio.
  select
    m.mes,
    count(b.*),
    count(b.*) filter (where stats_ganado(b.estado)),
    count(b.*) filter (where b.estado = 'perdido'),
    coalesce(sum(b.total_a_cargo), 0),
    coalesce(sum(b.total_a_cargo) filter (where stats_ganado(b.estado)), 0),
    -- Sin `coalesce`: un mes sin presupuestos no tiene ticket promedio.
    round(avg(b.total_a_cargo))
  from meses m
  left join base b on b.mes = m.mes
  group by m.mes
  order by m.mes;
$$;

-- ─────────────────────────────────────────────────────────────
-- 3) El código de la prestación no se pierde por un snapshot vacío
--
-- `(array_agg(codigo order by fecha desc))[1]` tomaba el primero sin
-- filtrar nulos: bastaba con que el presupuesto más reciente que usó
-- esa prestación tuviera el código vacío para que la tabla
-- «Tratamientos» quedara sin código, aunque el catálogo y todos los
-- demás snapshots lo tuvieran. `stats_obras_sociales` ya resolvía esto
-- bien con un `filter`; acá faltaba.
-- ─────────────────────────────────────────────────────────────

create or replace function stats_prestaciones(p_desde date, p_hasta date)
returns table (
  clave          text,
  nombre         text,
  codigo         text,
  veces          bigint,
  presupuestos   bigint,
  monto_prom     numeric,
  total_a_cargo  numeric,
  ganados        bigint,
  tasa           numeric
)
language sql stable
set search_path = public
as $$
  with items as (
    select
      coalesce(i.prestacion_id::text, 'suelta:' || lower(i.nombre)) as clave,
      i.nombre, i.codigo, i.monto, i.a_cargo,
      p.id as presupuesto_id, p.estado, p.fecha_emision
    from presupuesto_items i
    join presupuestos p on p.id = i.presupuesto_id
   where p.estado <> 'borrador'
     and p.fecha_emision between p_desde and p_hasta
  )
  select
    it.clave,
    coalesce(
      (array_agg(it.nombre order by it.fecha_emision desc)
        filter (where it.nombre is not null and it.nombre <> ''))[1],
      '(sin nombre)'
    ),
    (array_agg(it.codigo order by it.fecha_emision desc)
      filter (where it.codigo is not null and it.codigo <> ''))[1],
    count(*),
    count(distinct it.presupuesto_id),
    round(avg(it.monto)),
    coalesce(sum(it.a_cargo), 0),
    count(distinct it.presupuesto_id) filter (where stats_ganado(it.estado)),
    -- La tasa es por presupuesto, no por ítem: un presupuesto con dos
    -- coronas se ganó una vez, no dos.
    round(100.0 * count(distinct it.presupuesto_id) filter (where stats_ganado(it.estado))
          / nullif(count(distinct it.presupuesto_id), 0))
  from items it
  group by it.clave
  order by count(*) desc;
$$;
