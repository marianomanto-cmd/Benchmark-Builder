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

if (fallos > 0) {
  console.error(
    `\n${fallos} de ${casos.length} casos divergen. lib/calculo.ts y calcular_cobertura() tienen que coincidir.`,
  )
  process.exit(1)
}

console.log(`✓ ${casos.length} casos: lib/calculo.ts y calcular_cobertura() coinciden.`)
