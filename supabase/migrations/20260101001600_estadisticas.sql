-- ════════════════════════════════════════════════════════════════════
-- Smile Lab · Presupuestos — 17 · Estadísticas
--
-- Todo lo que se agrega vive acá y no en el cliente. Dos motivos, y los
-- dos duelen: PostgREST corta las lecturas en `max_rows`, así que sumar
-- en JS empieza a mentir en silencio en cuanto el consultorio tiene
-- historia; y una cuenta hecha en la pantalla es una cuenta que no se
-- puede verificar contra la base.
--
-- Todas son `stable` y de derechos de invocador: la RLS sigue mandando,
-- que es lo que queremos —ver estadísticas exige sesión, como todo lo
-- demás.
--
-- El universo es siempre **lo emitido**: `estado <> 'borrador'`. Un
-- borrador no es un presupuesto, es algo a medio cargar.
--
-- Y una definición que no se puede tocar sin tocar la Home:
-- «aceptado» acá significa lo mismo que allá —`aceptado` o `iniciado`
-- sobre el total emitido en la ventana—, para que los dos números
-- nunca se contradigan en dos pantallas de la misma app.
-- ════════════════════════════════════════════════════════════════════

/** Ganado = el paciente dijo que sí, haya arrancado o no el tratamiento. */
create or replace function stats_ganado(e estado_presupuesto) returns boolean
language sql immutable
as $$ select e in ('aceptado', 'iniciado') $$;

comment on function stats_ganado(estado_presupuesto) is
  'Misma definición de «aceptado» que usa la Home. Si cambia, cambian las dos.';

-- ─────────────────────────────────────────────────────────────
-- Los números de arriba
-- ─────────────────────────────────────────────────────────────

create or replace function stats_resumen(p_desde date, p_hasta date)
returns table (
  emitidos        bigint,
  monto_emitido   numeric,
  ganados         bigint,
  monto_ganado    numeric,
  perdidos        bigint,
  en_juego        bigint,
  monto_en_juego  numeric,
  ticket          numeric,
  dias_a_cierre   numeric
)
language sql stable
set search_path = public
as $$
  with base as (
    select p.id, p.estado, p.total_a_cargo, p.fecha_emision
      from presupuestos p
     where p.estado <> 'borrador'
       and p.fecha_emision between p_desde and p_hasta
  ),
  -- Cuándo se ganó cada uno, según el historial append-only.
  cierres as (
    select b.id, min(e.created_at) as cerrado_en, b.fecha_emision
      from base b
      join presupuesto_eventos e on e.presupuesto_id = b.id
     where e.estado_nuevo is not null and stats_ganado(e.estado_nuevo)
     group by b.id, b.fecha_emision
  )
  select
    count(*),
    coalesce(sum(b.total_a_cargo), 0),
    count(*) filter (where stats_ganado(b.estado)),
    coalesce(sum(b.total_a_cargo) filter (where stats_ganado(b.estado)), 0),
    count(*) filter (where b.estado = 'perdido'),
    count(*) filter (where b.estado <> 'perdido' and not stats_ganado(b.estado)),
    coalesce(sum(b.total_a_cargo) filter (where b.estado <> 'perdido' and not stats_ganado(b.estado)), 0),
    -- El ticket es sobre lo emitido: es «cuánto sale un presupuesto de
    -- este consultorio», no «cuánto sale uno de los que salieron bien».
    round(coalesce(avg(b.total_a_cargo), 0)),
    (select round(percentile_cont(0.5) within group (
              order by extract(epoch from (c.cerrado_en - c.fecha_emision::timestamptz)) / 86400
            )::numeric, 1)
       from cierres c)
  from base b;
$$;

-- ─────────────────────────────────────────────────────────────
-- Embudo: cuántos LLEGARON a cada etapa, no cuántos están hoy
--
-- La diferencia importa. «Hay 3 en interesado» es una foto de hoy;
-- «de 100 emitidos, 40 llegaron a interesado» es lo que dice dónde se
-- cae la venta. La trayectoria sale del historial, que es append-only:
-- el `creado` trae el estado inicial y cada `estado_cambiado` el
-- siguiente.
-- ─────────────────────────────────────────────────────────────

create or replace function stats_embudo(p_desde date, p_hasta date)
returns table (
  estado      estado_presupuesto,
  alcanzaron  bigint,
  monto       numeric
)
language sql stable
set search_path = public
as $$
  with base as (
    select p.id, p.total_a_cargo
      from presupuestos p
     where p.estado <> 'borrador'
       and p.fecha_emision between p_desde and p_hasta
  ),
  trayectoria as (
    select distinct b.id, e.estado_nuevo as estado, b.total_a_cargo
      from base b
      join presupuesto_eventos e on e.presupuesto_id = b.id
     where e.estado_nuevo is not null
       and e.estado_nuevo <> 'borrador'
  ),
  etapas as (
    select unnest(array[
      'realizado', 'enviado', 'pendiente', 'interesado', 'aceptado', 'iniciado'
    ]::estado_presupuesto[]) as estado
  )
  select
    et.estado,
    count(t.id),
    coalesce(sum(t.total_a_cargo), 0)
  from etapas et
  left join trayectoria t on t.estado = et.estado
  group by et.estado
  -- El orden del embudo es el de la máquina de estados, no el alfabético.
  order by array_position(
    array['realizado', 'enviado', 'pendiente', 'interesado', 'aceptado', 'iniciado']::estado_presupuesto[],
    et.estado
  );
$$;

-- ─────────────────────────────────────────────────────────────
-- Cuánto tarda un presupuesto en cada etapa
--
-- Mediana y no promedio: un presupuesto olvidado tres meses en
-- «enviado» corre el promedio y hace parecer lento a un circuito que
-- no lo es.
--
-- Sólo tramos CERRADOS —los que ya salieron de esa etapa—. Contar el
-- tiempo de los que todavía están adentro tira la mediana para abajo:
-- se los mide a mitad de camino.
-- ─────────────────────────────────────────────────────────────

create or replace function stats_tiempos(p_desde date, p_hasta date)
returns table (
  estado       estado_presupuesto,
  mediana_dias numeric,
  p90_dias     numeric,
  casos        bigint
)
language sql stable
set search_path = public
as $$
  with base as (
    select p.id
      from presupuestos p
     where p.estado <> 'borrador'
       and p.fecha_emision between p_desde and p_hasta
  ),
  tramos as (
    select
      e.estado_nuevo as estado,
      lead(e.created_at) over (partition by e.presupuesto_id order by e.created_at)
        - e.created_at as duracion
    from presupuesto_eventos e
    join base b on b.id = e.presupuesto_id
   where e.estado_nuevo is not null
     and e.estado_nuevo <> 'borrador'
  )
  select
    t.estado,
    round(percentile_cont(0.5) within group (order by extract(epoch from t.duracion) / 86400)::numeric, 1),
    round(percentile_cont(0.9) within group (order by extract(epoch from t.duracion) / 86400)::numeric, 1),
    count(*)
  from tramos t
  where t.duracion is not null
    -- Sólo las etapas del circuito. «Perdido» es terminal: si aparece
    -- con duración es porque alguien lo revivió, y eso no es «cuánto
    -- tarda un presupuesto en perderse».
    and t.estado = any(array[
      'realizado', 'enviado', 'pendiente', 'interesado', 'aceptado', 'iniciado'
    ]::estado_presupuesto[])
  group by t.estado
  order by array_position(
    array['realizado', 'enviado', 'pendiente', 'interesado', 'aceptado', 'iniciado']::estado_presupuesto[],
    t.estado
  );
$$;

-- ─────────────────────────────────────────────────────────────
-- Mes a mes
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
  with meses as (
    select generate_series(
      date_trunc('month', p_desde)::date,
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
  -- Los meses sin actividad van igual, en cero: un hueco en la serie
  -- se lee como «no pasó nada» sólo si el mes está dibujado.
  select
    m.mes,
    count(b.*),
    count(b.*) filter (where stats_ganado(b.estado)),
    count(b.*) filter (where b.estado = 'perdido'),
    coalesce(sum(b.total_a_cargo), 0),
    coalesce(sum(b.total_a_cargo) filter (where stats_ganado(b.estado)), 0),
    round(coalesce(avg(b.total_a_cargo), 0))
  from meses m
  left join base b on b.mes = m.mes
  group by m.mes
  order by m.mes;
$$;

-- ─────────────────────────────────────────────────────────────
-- Por qué se pierden
-- ─────────────────────────────────────────────────────────────

create or replace function stats_motivos(p_desde date, p_hasta date)
returns table (
  motivo motivo_perdida,
  casos  bigint,
  monto  numeric
)
language sql stable
set search_path = public
as $$
  select p.motivo_perdida, count(*), coalesce(sum(p.total_a_cargo), 0)
    from presupuestos p
   where p.estado = 'perdido'
     and p.motivo_perdida is not null
     and p.fecha_emision between p_desde and p_hasta
   group by p.motivo_perdida
   order by count(*) desc;
$$;

-- ─────────────────────────────────────────────────────────────
-- Obras sociales
--
-- El nombre sale del snapshot del presupuesto (`obra_social_nombre`),
-- no de un join: si mañana la obra social cambia de nombre, lo que se
-- presupuestó se presupuestó con el de ese día. Se agrupa por id para
-- que un cambio de nombre no parta la fila en dos, y se muestra el
-- último nombre visto.
-- ─────────────────────────────────────────────────────────────

create or replace function stats_obras_sociales(p_desde date, p_hasta date)
returns table (
  obra_social_id  uuid,
  nombre          text,
  presupuestos    bigint,
  monto_a_cargo   numeric,
  cobertura_pct   numeric,
  ganados         bigint,
  tasa            numeric,
  ticket          numeric
)
language sql stable
set search_path = public
as $$
  select
    p.obra_social_id,
    coalesce(
      (array_agg(p.obra_social_nombre order by p.fecha_emision desc)
        filter (where p.obra_social_nombre is not null))[1],
      'Particular'
    ),
    count(*),
    coalesce(sum(p.total_a_cargo), 0),
    -- Cobertura efectiva: qué porción del arancel se comió la obra
    -- social de verdad, incluidos los overrides del propio presupuesto.
    round(100 * coalesce(sum(p.total_cobertura), 0) / nullif(sum(p.subtotal), 0), 1),
    count(*) filter (where stats_ganado(p.estado)),
    round(100.0 * count(*) filter (where stats_ganado(p.estado)) / nullif(count(*), 0)),
    round(coalesce(avg(p.total_a_cargo), 0))
  from presupuestos p
  where p.estado <> 'borrador'
    and p.fecha_emision between p_desde and p_hasta
  group by p.obra_social_id
  order by count(*) desc;
$$;

-- ─────────────────────────────────────────────────────────────
-- Prestaciones
--
-- Se agrupa por `prestacion_id` y se muestra el último nombre del
-- snapshot. Los ítems sueltos (sin prestación del catálogo) se agrupan
-- por su nombre normalizado.
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
    (array_agg(it.nombre order by it.fecha_emision desc))[1],
    (array_agg(it.codigo order by it.fecha_emision desc))[1],
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

-- ─────────────────────────────────────────────────────────────
-- Profesionales
-- ─────────────────────────────────────────────────────────────

create or replace function stats_profesionales(p_desde date, p_hasta date)
returns table (
  profesional_id uuid,
  nombre         text,
  emitidos       bigint,
  ganados        bigint,
  tasa           numeric,
  monto_ganado   numeric,
  ticket         numeric
)
language sql stable
set search_path = public
as $$
  select
    p.profesional_id,
    (array_agg(p.profesional_nombre order by p.fecha_emision desc))[1],
    count(*),
    count(*) filter (where stats_ganado(p.estado)),
    round(100.0 * count(*) filter (where stats_ganado(p.estado)) / nullif(count(*), 0)),
    coalesce(sum(p.total_a_cargo) filter (where stats_ganado(p.estado)), 0),
    round(coalesce(avg(p.total_a_cargo), 0))
  from presupuestos p
  where p.estado <> 'borrador'
    and p.fecha_emision between p_desde and p_hasta
  group by p.profesional_id
  order by count(*) desc;
$$;

-- ─────────────────────────────────────────────────────────────
-- Pacientes: cuántos vuelven
--
-- La recurrencia se mide sobre TODA la historia del paciente, no sobre
-- la ventana: alguien que volvió en marzo volvió, aunque se esté
-- mirando septiembre. La ventana elige de quiénes hablamos; el conteo
-- mira su historia entera.
-- ─────────────────────────────────────────────────────────────

create or replace function stats_pacientes(p_desde date, p_hasta date)
returns table (
  pacientes          bigint,
  con_uno            bigint,
  recurrentes        bigint,
  tasa_recurrencia   numeric,
  prom_por_paciente  numeric,
  dias_entre         numeric,
  monto_por_paciente numeric
)
language sql stable
set search_path = public
as $$
  with delaVentana as (
    select distinct p.paciente_id
      from presupuestos p
     where p.estado <> 'borrador'
       and p.fecha_emision between p_desde and p_hasta
  ),
  historia as (
    select p.paciente_id, p.fecha_emision, p.total_a_cargo,
           lag(p.fecha_emision) over (partition by p.paciente_id order by p.fecha_emision) as anterior
      from presupuestos p
      join delaVentana v on v.paciente_id = p.paciente_id
     where p.estado <> 'borrador'
  ),
  porPaciente as (
    select paciente_id, count(*) as n, sum(total_a_cargo) as monto
      from historia group by paciente_id
  )
  select
    count(*),
    count(*) filter (where pp.n = 1),
    count(*) filter (where pp.n > 1),
    round(100.0 * count(*) filter (where pp.n > 1) / nullif(count(*), 0)),
    round(avg(pp.n), 2),
    (select round(percentile_cont(0.5) within group (order by (h.fecha_emision - h.anterior))::numeric, 0)
       from historia h where h.anterior is not null),
    round(coalesce(avg(pp.monto), 0))
  from porPaciente pp;
$$;

-- ─────────────────────────────────────────────────────────────
-- Qué antigüedad tiene lo que está en juego HOY
--
-- Sin ventana a propósito: es la pregunta «¿a quién tengo que llamar
-- hoy?», y no depende del rango que se esté mirando.
-- ─────────────────────────────────────────────────────────────

create or replace function stats_aging()
returns table (
  tramo  text,
  orden  int,
  casos  bigint,
  monto  numeric
)
language sql stable
set search_path = public
as $$
  with abiertos as (
    select
      p.total_a_cargo,
      (current_date - p.estado_desde::date) as dias
    from presupuestos p
    where p.estado <> 'borrador'
      and p.estado <> 'perdido'
      and not stats_ganado(p.estado)
  ),
  tramos as (
    select
      case
        when dias <= 7  then 'Hasta 7 días'
        when dias <= 15 then '8 a 15 días'
        when dias <= 30 then '16 a 30 días'
        else 'Más de 30 días'
      end as tramo,
      case
        when dias <= 7  then 1
        when dias <= 15 then 2
        when dias <= 30 then 3
        else 4
      end as orden,
      total_a_cargo
    from abiertos
  ),
  todos as (
    select * from (values
      ('Hasta 7 días', 1), ('8 a 15 días', 2), ('16 a 30 días', 3), ('Más de 30 días', 4)
    ) as t(tramo, orden)
  )
  select t.tramo, t.orden, count(x.*), coalesce(sum(x.total_a_cargo), 0)
    from todos t
    left join tramos x on x.orden = t.orden
   group by t.tramo, t.orden
   order by t.orden;
$$;

-- ─────────────────────────────────────────────────────────────
-- Evolución del precio de una prestación
--
-- Esto sólo se puede contestar porque `aranceles` es append-only: cada
-- cambio de precio dejó su fila con la fecha desde la que rigió. Es la
-- recompensa de la regla más estricta del sistema.
-- ─────────────────────────────────────────────────────────────

create or replace function stats_precios(p_prestacion uuid)
returns table (
  vigente_desde date,
  obra_social   text,
  monto         numeric
)
language sql stable
set search_path = public
as $$
  select
    a.vigente_desde,
    coalesce(os.nombre, 'Particular'),
    a.monto
  from aranceles a
  left join obras_sociales os on os.id = a.obra_social_id
  where a.prestacion_id = p_prestacion
  order by a.vigente_desde, coalesce(os.nombre, 'Particular');
$$;
