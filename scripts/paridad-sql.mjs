/**
 * Verifica que `lib/calculo.ts` y `calcular_cobertura()` en SQL den
 * exactamente el mismo número para todos los casos compartidos.
 *
 * Si divergen, el preview del wizard le miente al paciente respecto de
 * lo que la base va a congelar en el documento.
 *
 *   node scripts/paridad-sql.mjs "postgresql://usuario@host:puerto/base"
 *   node scripts/paridad-sql.mjs            # usa $DATABASE_URL
 *
 * Necesita `psql` en el PATH. Sin conexión sale con código 0 y avisa:
 * `npm test` cubre el lado del cliente siempre.
 */

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import { calcularItem } from '../lib/calculo.ts'

const aqui = dirname(fileURLToPath(import.meta.url))
const { casos } = JSON.parse(
  readFileSync(join(aqui, '..', 'tests', 'casos-cobertura.json'), 'utf8'),
)

const url = process.argv[2] ?? process.env.DATABASE_URL
if (!url) {
  console.log('· Sin DATABASE_URL: se omite la verificación de paridad con SQL.')
  console.log('  Pasá la URL como argumento para correrla contra una base real.')
  process.exit(0)
}

const consulta = casos
  .map(
    (c, i) =>
      `select ${i} as i, calcular_cobertura(${c.monto}, '${c.tipo}'::tipo_cobertura, ${c.valor}) as cob`,
  )
  .join(' union all ')

let salida
try {
  salida = execFileSync(
    'psql',
    [url, '-t', '-A', '-F', '|', '-v', 'ON_ERROR_STOP=1', '-c', consulta],
    { encoding: 'utf8' },
  )
} catch (e) {
  console.error('✗ No se pudo consultar la base:', e.message)
  process.exit(1)
}

const deSql = new Map(
  salida
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((l) => {
      const [i, cob] = l.split('|')
      return [Number(i), Number(cob)]
    }),
)

let fallos = 0
for (const [i, c] of casos.entries()) {
  const ts = calcularItem(c.monto, c.tipo, c.valor).cobertura
  const sql = deSql.get(i)
  if (!(ts === sql && ts === c.cobertura)) {
    fallos++
    console.error(
      `✗ ${c.monto} · ${c.tipo} ${c.valor} — TS: ${ts} · SQL: ${sql} · esperado: ${c.cobertura}  (${c.nota})`,
    )
  }
}

/**
 * Barrido de fuerza bruta.
 *
 * Los casos del fixture cubren lo que se conoce; esto sale a buscar lo
 * que no. Así apareció la divergencia de un peso con los porcentajes de
 * dos decimales: el float de JS dividía antes de multiplicar y daba
 * 384.961 donde la base congelaba 384.962.
 */
const barrido = []
const montos = [0, 1, 7, 999, 12345, 48000, 126000, 385000, 720000, 999999, 12345678, 99999999]
const porcentajes = [0, 1, 12.5, 33, 33.33, 50, 66.67, 70, 99, 99.99, 100]
const fijos = [0, 1, 12345, 50000, 999999]

for (const m of montos) {
  for (const v of porcentajes) barrido.push([m, 'porcentaje', v])
  for (const v of fijos) barrido.push([m, 'monto', v])
  barrido.push([m, 'ninguna', 0])
}

const consultaBarrido = barrido
  .map(([m, t, v], i) => `select ${i} i, calcular_cobertura(${m},'${t}'::tipo_cobertura,${v}) c`)
  .join(' union all ')

const salidaBarrido = execFileSync(
  'psql',
  [url, '-t', '-A', '-F', '|', '-v', 'ON_ERROR_STOP=1', '-c', consultaBarrido],
  { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
)

const sqlBarrido = new Map(
  salidaBarrido
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((l) => {
      const [i, c] = l.split('|')
      return [Number(i), Number(c)]
    }),
)

for (const [i, [m, t, v]] of barrido.entries()) {
  const ts = calcularItem(m, t, v).cobertura
  const sql = sqlBarrido.get(i)
  if (ts !== sql) {
    fallos++
    console.error(`✗ monto=${m} ${t}=${v} — TS: ${ts} · SQL: ${sql} (diferencia ${ts - sql})`)
  }
}

const total = casos.length + barrido.length

if (fallos > 0) {
  console.error(
    `\n${fallos} de ${total} casos divergen. lib/calculo.ts y calcular_cobertura() tienen que coincidir: el wizard muestra el primero y la base congela el segundo.`,
  )
  process.exit(1)
}

console.log(`✓ ${total} casos: lib/calculo.ts y calcular_cobertura() coinciden exactamente.`)
