-- ════════════════════════════════════════════════════════════════════
-- Smile Lab · Presupuestos — 27 · La lista de precios del mes, desde
--                                  un Excel
--
-- Una vez por mes el consultorio actualiza los precios particulares
-- con una planilla de tres columnas: Tipo (el rubro), Subtipo (la
-- prestación) y Efectivo (el precio). Cargarla a mano eran sesenta
-- vigencias nuevas una por una.
--
-- `importar_aranceles()` hace las dos mitades con el MISMO código:
--
--   · con `p_aplicar = false` es la vista previa: dice, fila por fila,
--     qué va a pasar (prestación nueva, precio nuevo, sin cambios,
--     error) sin escribir nada;
--   · con `p_aplicar = true` escribe exactamente eso, en una sola
--     transacción.
--
-- Que sean la misma función es lo que garantiza que la vista previa no
-- mienta: el reconocimiento de cada subtipo contra la biblioteca —que
-- es lo que decide si se crea una prestación o no— vive en un solo
-- lugar.
--
-- SIN DUPLICADOS
-- «Limpieza (sola)», «LIMPIEZA (SOLA)», «Limpieza  (sola) » y «Limpieza
-- sola» son la misma prestación. El índice único de la migración 24
-- (`lower(nombre)`) sólo agarra la primera variante. La importación
-- compara con `clave_catalogo()`, que además ignora acentos, signos y
-- espacios: un subtipo que existe se reconoce aunque la planilla lo
-- escriba distinto, y nunca se crea dos veces. Si la biblioteca ya
-- tiene dos prestaciones con la misma clave, la fila no adivina: se
-- marca como error para que alguien las unifique.
--
-- Dentro del mismo Excel, una fila repetida con el mismo precio se
-- carga una sola vez; repetida con precios distintos es un error,
-- porque no hay forma de saber cuál es el bueno.
--
-- Dos importaciones a la vez se serializan con un advisory lock: la
-- segunda espera y, cuando entra, ya ve las prestaciones que creó la
-- primera.
-- ════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- La identidad de un nombre del catálogo: sin acentos, en minúsculas,
-- y con cualquier racha de signos o espacios colapsada a un espacio.
-- ─────────────────────────────────────────────────────────────

create or replace function clave_catalogo(t text) returns text
language sql immutable strict parallel safe
set search_path = public, extensions
as $$ select btrim(regexp_replace(sin_acentos(t), '[^a-z0-9]+', ' ', 'g')) $$;

comment on function clave_catalogo(text) is
  'Identidad de un nombre del catálogo para reconocerlo aunque se escriba '
  'distinto: sin acentos, minúsculas, signos y espacios colapsados.';

create index if not exists prestaciones_clave_idx on prestaciones (clave_catalogo(nombre));

-- ─────────────────────────────────────────────────────────────
-- La importación
--
-- `p_filas` es lo que leyó el navegador de la planilla:
--   [{ "fila": 2, "rubro": "Endodoncia", "nombre": "Endodoncia premolar",
--      "monto": 285000 }, …]
-- `fila` es el número de fila del Excel, para poder señalarla.
-- `monto` llega null si la celda estaba vacía o no se pudo leer.
--
-- `p_omitir` son las filas que la persona destildó en la vista previa
-- (típicamente, un precio que se ve mal). No se escriben, pero se
-- devuelven con lo que habría pasado para poder volver a incluirlas.
--
-- Por fila devuelve `estado`:
--   crear       prestación nueva + su precio particular
--   actualizar  precio nuevo: abre una vigencia y cierra la anterior
--   corregir    ya había una vigencia que arranca ese mismo día: se
--               corrige en el lugar (es volver a subir el Excel del mes)
--   igual       el precio ya es ése: no se escribe nada
--   repetida    repite otra fila del Excel con el mismo precio
--   omitida     la persona la sacó de la importación
--   error       no se puede cargar; `mensaje` dice por qué
-- ─────────────────────────────────────────────────────────────

create or replace function importar_aranceles(
  p_filas    jsonb,
  p_desde    date,
  p_aplicar  boolean default false,
  p_omitir   int[]   default '{}',
  p_archivo  text    default null
) returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  r            record;
  v_salida     jsonb := '[]'::jsonb;
  v_estado     text;
  v_mensaje    text;
  v_avisos     text[];
  v_n          int;
  v_nombres    text;
  v_rubro      text;
  v_prest      prestaciones%rowtype;
  v_vig        aranceles%rowtype;
  v_abierta    aranceles%rowtype;
  v_posterior  aranceles%rowtype;
  v_usos       int;
  v_ultima     date;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  if p_desde is null then
    raise exception 'Falta la fecha desde la que rigen los precios';
  end if;
  if p_filas is null or jsonb_typeof(p_filas) <> 'array' or jsonb_array_length(p_filas) = 0 then
    raise exception 'El Excel no trae filas para importar';
  end if;
  if jsonb_array_length(p_filas) > 2000 then
    raise exception 'El Excel trae más de 2.000 filas: partilo en dos archivos';
  end if;

  if p_aplicar then
    perform pg_advisory_xact_lock(hashtext('smilelab.importar_aranceles'));
    -- El origen ya dice «Excel»: el motivo es el nombre del archivo,
    -- que es lo que alguien va a buscar cuando pregunte de dónde salió
    -- un precio.
    perform marcar_origen_arancel('excel', nullif(btrim(p_archivo), ''));
  end if;

  for r in
    with filas as (
      select x.fila,
             regexp_replace(btrim(coalesce(x.nombre, '')), '\s+', ' ', 'g') as nombre,
             nullif(regexp_replace(btrim(coalesce(x.rubro, '')), '\s+', ' ', 'g'), '') as rubro,
             x.monto,
             clave_catalogo(coalesce(x.nombre, '')) as clave,
             (x.fila = any(coalesce(p_omitir, '{}'::int[]))) as omitida
        from jsonb_to_recordset(p_filas) as x(fila int, rubro text, nombre text, monto numeric)
    ),
    -- Las repeticiones se cuentan entre las filas que se van a cargar:
    -- si la persona destilda una de dos filas en conflicto, la otra
    -- deja de estarlo. Y sólo entre las que se PUEDEN cargar: una fila
    -- con el precio ilegible es un error por su cuenta, y si contara
    -- acá dejaba a su gemela válida marcada como «repetida» y la
    -- prestación sin precio.
    grupos as (
      select clave,
             count(*)               as n,
             count(distinct monto)  as montos,
             min(fila)              as primera,
             string_agg(fila::text, ', ' order by fila) as filas
        from filas
       where not omitida
         and clave <> ''
         and length(nombre) <= 200
         and monto is not null
         and monto between 0 and 999999999
         and monto = round(monto)
       group by clave
    )
    select f.*, g.n, g.montos, g.primera, g.filas as filas_grupo
      from filas f
      left join grupos g on g.clave = f.clave
     order by f.fila
  loop
    v_estado    := null;
    v_mensaje   := null;
    v_avisos    := '{}';
    v_rubro     := null;
    v_prest     := null;
    v_vig       := null;
    v_abierta   := null;
    v_posterior := null;
    v_usos      := 0;
    v_ultima    := null;

    -- 1) Lo que trae la fila, sola.
    if r.clave = '' then
      v_estado := 'error';
      v_mensaje := 'Falta el subtipo';
    elsif length(r.nombre) > 200 then
      v_estado := 'error';
      v_mensaje := 'El subtipo pasa de 200 caracteres';
    elsif r.monto is null then
      v_estado := 'error';
      v_mensaje := 'Falta el precio, o no se pudo leer';
    elsif r.monto < 0 then
      v_estado := 'error';
      v_mensaje := 'El precio no puede ser negativo';
    elsif r.monto > 999999999 then
      v_estado := 'error';
      v_mensaje := 'El precio es demasiado grande: revisá la celda';
    elsif r.monto <> round(r.monto) then
      v_estado := 'error';
      v_mensaje := 'Los precios van en pesos enteros, sin centavos';
    elsif not r.omitida and r.n > 1 and r.montos > 1 then
      v_estado := 'error';
      v_mensaje := format('Aparece %s veces con precios distintos (filas %s): dejá una sola',
                          r.n, r.filas_grupo);
    elsif not r.omitida and r.n > 1 and r.fila <> r.primera then
      v_estado := 'repetida';
      v_mensaje := format('Repite la fila %s con el mismo precio: se carga una sola vez', r.primera);
    end if;

    -- 2) El rubro, escrito como ya está en la biblioteca: «ENDODONCIA»
    --    en la planilla es «Endodoncia» acá, no un rubro nuevo.
    if r.rubro is not null then
      select p.rubro into v_rubro
        from prestaciones p
       where p.rubro is not null
         and clave_catalogo(p.rubro) = clave_catalogo(r.rubro)
       group by p.rubro
       order by count(*) desc, p.rubro
       limit 1;
      v_rubro := coalesce(v_rubro, r.rubro);
    end if;

    -- 3) La prestación.
    if v_estado is null then
      select count(*), string_agg(p.nombre, ' · ' order by p.nombre)
        into v_n, v_nombres
        from prestaciones p
       where clave_catalogo(p.nombre) = r.clave;

      if v_n > 1 then
        v_estado := 'error';
        v_mensaje := format(
          'En la biblioteca hay %s prestaciones que se llaman así (%s): unificalas antes de importar',
          v_n, v_nombres);
      elsif v_n = 1 then
        select * into v_prest from prestaciones p where clave_catalogo(p.nombre) = r.clave;
      else
        v_estado := 'crear';
      end if;
    end if;

    -- 4) El precio particular de una prestación que ya existe.
    if v_estado is null then
      select * into v_vig from arancel_vigente(v_prest.id, null, p_desde);

      select * into v_abierta
        from aranceles
       where prestacion_id = v_prest.id
         and obra_social_id is null
         and vigente_hasta is null;

      select * into v_posterior
        from aranceles
       where prestacion_id = v_prest.id
         and obra_social_id is null
         and vigente_desde > p_desde
       order by vigente_desde
       limit 1;

      if v_vig.id is not null and v_vig.monto = r.monto then
        v_estado := 'igual';
        if v_posterior.id is not null then
          v_avisos := v_avisos || format('Ya tiene otro precio programado desde el %s: ése no se toca',
                                         to_char(v_posterior.vigente_desde, 'DD/MM/YYYY'));
        end if;
      elsif v_posterior.id is not null then
        v_estado := 'error';
        v_mensaje := format(
          'Ya tiene un precio cargado desde el %s, después de la fecha elegida: corregilo a mano o elegí una fecha posterior',
          to_char(v_posterior.vigente_desde, 'DD/MM/YYYY'));
      elsif v_vig.id is not null and v_vig.vigente_desde = p_desde then
        -- Volver a subir el Excel del mes con un precio arreglado: la
        -- vigencia de ese día se corrige, no se apila otra encima.
        v_estado := 'corregir';
        v_usos := usos_emitidos_arancel(v_vig.id);
        if v_usos > 0 then
          v_avisos := v_avisos || format(
            'El precio que se corrige ya se usó en %s presupuesto(s) emitido(s): esos conservan el suyo',
            v_usos);
        end if;
      elsif v_vig.id is not null and v_vig.vigente_hasta is not null then
        -- Rige ese día pero está cerrada y no la sigue nadie: abrir otra
        -- encima haría regir dos precios el mismo día.
        v_estado := 'error';
        v_mensaje := format(
          'Tiene un precio cargado hasta el %s: corregilo o borralo a mano, o elegí una fecha posterior',
          to_char(v_vig.vigente_hasta, 'DD/MM/YYYY'));
      else
        v_estado := 'actualizar';
        if v_abierta.id is not null then
          v_usos := usos_emitidos_arancel(v_abierta.id);

          -- La misma condición que `guard_arancel_cierre_valido`, dicha
          -- antes: un presupuesto emitido el día X citando el precio
          -- de hoy impide cerrarlo antes de X.
          select max(p.fecha_emision) into v_ultima
            from presupuesto_items i
            join presupuestos p on p.id = i.presupuesto_id
           where i.arancel_id = v_abierta.id
             and p.estado <> 'borrador';

          if v_ultima is not null and v_ultima >= p_desde then
            v_estado := 'error';
            v_mensaje := format(
              'El precio actual se usó en un presupuesto emitido el %s: elegí una fecha posterior',
              to_char(v_ultima, 'DD/MM/YYYY'));
          end if;
        end if;
      end if;

      if not v_prest.activa then
        v_avisos := v_avisos ||
          'Está dada de baja en la biblioteca: el precio se carga, pero el wizard no la ofrece hasta que la reactives'::text;
      end if;

      if v_rubro is not null and v_prest.rubro is null then
        v_avisos := v_avisos || format('Queda en el rubro «%s»', v_rubro);
      elsif v_rubro is not null and clave_catalogo(v_prest.rubro) <> clave_catalogo(v_rubro) then
        v_avisos := v_avisos || format('En la biblioteca está en «%s»: el rubro no se cambia', v_prest.rubro);
      end if;
    end if;

    -- 5) Escribir.
    if p_aplicar and not r.omitida then
      if v_estado = 'crear' then
        insert into prestaciones (nombre, rubro)
        values (r.nombre, v_rubro)
        returning * into v_prest;

        perform nueva_vigencia(v_prest.id, null, r.monto, 'ninguna', 0, p_desde);
      elsif v_estado = 'actualizar' then
        perform nueva_vigencia(
          v_prest.id, null, r.monto,
          coalesce(v_abierta.cobertura_tipo, 'ninguna'),
          coalesce(v_abierta.cobertura_valor, 0),
          p_desde);
      elsif v_estado = 'corregir' then
        update aranceles
           set monto = r.monto,
               corregido_at = now()
         where id = v_vig.id;
      end if;

      if v_estado in ('actualizar', 'corregir', 'igual')
         and v_prest.rubro is null and v_rubro is not null then
        update prestaciones set rubro = v_rubro where id = v_prest.id;
      end if;
    end if;

    v_salida := v_salida || jsonb_build_object(
      'fila',             r.fila,
      'nombre',           r.nombre,
      'rubro',            v_rubro,
      'monto',            r.monto,
      'estado',           case when r.omitida then 'omitida' else v_estado end,
      'previsto',         v_estado,
      'mensaje',          v_mensaje,
      'avisos',           to_jsonb(v_avisos),
      'prestacion_id',    v_prest.id,
      'prestacion',       v_prest.nombre,
      'rubro_biblioteca', v_prest.rubro,
      'activa',           v_prest.activa,
      'monto_actual',     v_vig.monto,
      'desde_actual',     v_vig.vigente_desde,
      'usos',             v_usos,
      -- Sólo en el error de «el precio actual se usó en un presupuesto
      -- emitido»: la pantalla ofrece arrancar el día siguiente.
      'emitido_el',       case when v_estado = 'error' then v_ultima end
    );
  end loop;

  return jsonb_build_object('desde', p_desde, 'aplicado', p_aplicar, 'filas', v_salida);
end $$;

revoke execute on function importar_aranceles(jsonb, date, boolean, int[], text) from public, anon;
grant execute on function importar_aranceles(jsonb, date, boolean, int[], text) to authenticated;
