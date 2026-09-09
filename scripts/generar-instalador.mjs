/**
 * Genera `supabase/instalar.sql` e `instalar-storage.sql` a partir de
 * `supabase/migrations/`.
 *
 * Existen para poder instalar la base pegando en el SQL Editor de
 * Supabase, sin la CLI. La fuente de verdad siguen siendo las
 * migraciones: si tocás una, corré `npm run sql:instalar` y commiteá
 * los dos archivos en el mismo cambio.
 *
 * Lo único que se transforma es `create policy`, que no acepta
 * `IF NOT EXISTS`: se le antepone el `drop policy if exists` para que
 * el script se pueda volver a correr.
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const dirMigraciones = join(raiz, 'supabase', 'migrations')

const migraciones = readdirSync(dirMigraciones)
  .filter((f) => f.endsWith('.sql'))
  .sort()

const idempotente = (sql) =>
  sql.replace(
    /create policy\s+("[^"]+")\s+on\s+([\w.]+)/g,
    (_, nombre, tabla) =>
      `drop policy if exists ${nombre} on ${tabla};\ncreate policy ${nombre} on ${tabla}`,
  )

/**
 * Parte el SQL en bloques: cada `create or replace function` o
 * `create view` queda identificado por el objeto que define.
 *
 * Las migraciones son incrementales, así que varias redefinen lo que ya
 * había: `duplicar_presupuesto` se escribe cuatro veces y sólo la
 * última cuenta. Pegar las cuatro en el SQL Editor funciona, pero son
 * 50 KB de versiones muertas que alguien va a leer creyendo que rigen.
 */
function bloques(sql) {
  const salida = []
  // `$$` delimita el cuerpo de las funciones: hay que saltearlo entero
  // para no cortar en un `;` que está adentro.
  const re = /(create or replace function\s+(\w+)|(?:drop view if exists\s+\w+\s*;\s*)?create view\s+(\w+))/g
  let ultimo = 0
  let m
  while ((m = re.exec(sql)) !== null) {
    const objeto = m[2] ?? m[3]
    const desdeInicio = m.index
    // Fin del bloque: `$$;` para funciones, `;` para vistas.
    const esFuncion = Boolean(m[2])
    let fin
    if (esFuncion) {
      const cierre = sql.indexOf('$$;', desdeInicio)
      fin = cierre === -1 ? sql.length : cierre + 3
    } else {
      // Una vista termina en el primer `;` fuera de paréntesis.
      let i = desdeInicio
      let nivel = 0
      for (; i < sql.length; i++) {
        if (sql[i] === '(') nivel++
        else if (sql[i] === ')') nivel--
        else if (sql[i] === ';' && nivel === 0) break
      }
      fin = Math.min(i + 1, sql.length)
    }
    if (desdeInicio > ultimo) salida.push({ objeto: null, texto: sql.slice(ultimo, desdeInicio) })
    salida.push({ objeto, texto: sql.slice(desdeInicio, fin) })
    ultimo = fin
    re.lastIndex = fin
  }
  if (ultimo < sql.length) salida.push({ objeto: null, texto: sql.slice(ultimo) })
  return salida
}

/**
 * Deja una sola definición por objeto: la última que se escribió,
 * puesta donde aparecía la primera.
 *
 * La posición importa: `create trigger ... execute function
 * guard_arancel_inmutable()` exige que la función exista en ESE punto.
 * Si la definición final se emitiera al final, el trigger no la
 * encontraría.
 */
function soloDefinicionesFinales(archivos) {
  const todos = archivos.flatMap((a) => bloques(a.sql).map((b) => ({ ...b, archivo: a.nombre })))

  const ultimaVersion = new Map()
  for (const b of todos) if (b.objeto) ultimaVersion.set(b.objeto, b.texto)

  const yaEmitido = new Set()
  return todos
    .map((b) => {
      if (!b.objeto) return b
      if (yaEmitido.has(b.objeto)) return null // redefinición posterior: se descarta
      yaEmitido.add(b.objeto)
      return { ...b, texto: ultimaVersion.get(b.objeto) }
    })
    .filter(Boolean)
}

const CABECERA_1 = `-- ════════════════════════════════════════════════════════════════════
--  SMILE LAB · PRESUPUESTOS — INSTALACIÓN  ·  PARTE 1 de 3
--  Esquema, guardas, RPC, vistas y RLS.
--
--  CÓMO: Supabase → SQL Editor → New query → pegar TODO → Run.
--  Corre entero o no corre: si algo falla, no queda nada a medias.
--
--  NO editar acá. Se genera desde \`supabase/migrations/\` con
--  \`npm run sql:instalar\`. La fuente de verdad son las migraciones.
--
--  ¿Ya lo corriste y querés empezar de cero? Descomentá el bloque de
--  abajo (BORRA TODOS LOS DATOS) y corré el script otra vez.
-- ════════════════════════════════════════════════════════════════════

-- ─── RESET · descomentar sólo para reinstalar desde cero ────────────
-- drop view if exists aranceles_usos, aranceles_programados,
--                     aranceles_vigentes, presupuestos_listado cascade;
-- drop table if exists presupuesto_eventos, presupuesto_cuotas,
--                      presupuesto_items, presupuestos, aranceles,
--                      prestacion_cuotas, prestaciones, pacientes,
--                      obras_sociales, profesionales cascade;
-- drop type if exists estado_presupuesto, motivo_perdida, tipo_cobertura cascade;
-- drop sequence if exists presupuesto_seq cascade;
-- drop function if exists calcular_cobertura, actor_nombre, nueva_vigencia,
--                         aumento_masivo, crear_presupuesto, duplicar_presupuesto,
--                         cambiar_estado, registrar_evento, marcar_pendientes,
--                         arancel_vigente, touch_updated_at, touch_estado_desde,
--                         set_presupuesto_numero, guard_arancel_inmutable,
--                         guard_arancel_no_delete, guard_item_emitido,
--                         guard_evento_inmutable, guard_presupuesto_emitido cascade;
-- ────────────────────────────────────────────────────────────────────
`

const CABECERA_2 = `-- ════════════════════════════════════════════════════════════════════
--  SMILE LAB · PRESUPUESTOS — INSTALACIÓN  ·  PARTE 2 de 3
--  Storage: bucket privado \`presupuestos\` para los PDF.
--
--  Va aparte porque las policies de \`storage.objects\` dependen de
--  permisos que algunos proyectos no dan desde el SQL Editor. Si esta
--  parte falla, la 1 ya quedó aplicada y el bucket se puede crear a
--  mano: Storage → New bucket → nombre \`presupuestos\`, PRIVADO.
-- ════════════════════════════════════════════════════════════════════
`

/**
 * Saca el banner de encabezado de una migración.
 *
 * Cada migración arranca con un bloque que cuenta QUÉ BUG ARREGLA. Eso
 * es historia del proyecto y pertenece a `supabase/migrations/` y a
 * git, no a un script que instala una base vacía: ahí no hubo ningún
 * bug que arreglar. Además, al quedarse una sola definición de cada
 * función, esos banners quedaban huérfanos — cuarenta líneas
 * explicando un arreglo, seguidas de dos `grant`.
 *
 * Los comentarios de adentro del código SÍ se conservan: explican por
 * qué existe cada guarda, y eso sigue valiendo en una base nueva.
 */
function sinBanner(sql) {
  return sql.replace(/^\s*-- ═{10,}[\s\S]*?-- ═{10,}\n/, '')
}

/** ¿El bloque aporta SQL, o son sólo comentarios y espacios? */
function tieneSql(texto) {
  return texto
    .split('\n')
    .some((l) => l.trim() !== '' && !l.trim().startsWith('--'))
}

function armar(cabecera, archivos) {
  const fuente = archivos.map((nombre) => ({
    nombre,
    sql: sinBanner(idempotente(readFileSync(join(dirMigraciones, nombre), 'utf8'))),
  }))

  const bloques = soloDefinicionesFinales(fuente)

  // Las secciones que se quedaron sin SQL (porque su definición se
  // emitió antes) no llevan encabezado: sería un título sin contenido.
  const conSql = new Set(
    bloques.filter((b) => tieneSql(b.texto)).map((b) => b.archivo),
  )

  const partes = [cabecera]
  let archivoActual = null
  for (const b of bloques) {
    if (!conSql.has(b.archivo)) continue
    if (b.archivo !== archivoActual) {
      archivoActual = b.archivo
      const etiqueta = archivoActual.replace(/^\d+_/, '').replace(/\.sql$/, '').replace(/_/g, ' ')
      partes.push(`\n-- ─── ${etiqueta} ───────────────────────────────────────\n`)
    }
    partes.push(b.texto)
  }

  // Tres líneas en blanco seguidas son ruido de la concatenación.
  return partes.join('\n').replace(/\n{4,}/g, '\n\n\n')
}

const esStorage = (f) => f.includes('storage')

writeFileSync(
  join(raiz, 'supabase', 'instalar.sql'),
  armar(CABECERA_1, migraciones.filter((f) => !esStorage(f))),
)
writeFileSync(
  join(raiz, 'supabase', 'instalar-storage.sql'),
  armar(CABECERA_2, migraciones.filter(esStorage)),
)

console.log(
  `✓ instalar.sql (${migraciones.filter((f) => !esStorage(f)).length} migraciones) ` +
    `e instalar-storage.sql generados desde supabase/migrations/`,
)
