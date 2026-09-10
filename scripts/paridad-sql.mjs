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

import { calcularItem, montoConAumento } from '../lib/calculo.ts'

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

/* ═══════════════════════════════════════════════════════════
   El aumento masivo, que es el otro par TS/SQL
   ═══════════════════════════════════════════════════════════

   `montoConAumento()` trabaja en centésimas y `aumento_masivo()` en SQL
   usa el porcentaje completo. Mientras el porcentaje tenga a lo sumo
   dos decimales —la acción lo redondea antes de llamar a la RPC— los
   dos dan el mismo número. Este barrido es lo que ata esa promesa: sin
   él, cualquiera puede sacar el redondeo del schema sin que nada se
   queje, y el preview del aumento vuelve a prometer un peso más o menos
   por arancel que el que la base escribe.
   ═══════════════════════════════════════════════════════════ */

const aumentos = []
for (let i = 0; i < 2000; i++) {
  aumentos.push([
    Math.floor(Math.random() * 900_000) + 1,
    Math.round((Math.random() * 390 - 90) * 100) / 100,
  ])
}
for (const pct of [0.01, 0.5, 1, 2.5, 10, 12.35, 33.33, 50, 66.67, 99.99, 100, 300, -90, -33.33]) {
  for (const monto of [1, 3, 7, 999, 1000, 12345, 13000, 99999, 100001, 500000, 899999]) {
    aumentos.push([monto, pct])
  }
}

// La consulta va por stdin y no por `-c`: dos mil casos en la línea de
// comandos se pasan del límite del sistema (`spawnSync psql E2BIG`).
const consultaAumentos = `
  select i - 1, round(m * (100 + p) / 100)
    from unnest(
      array[${aumentos.map(([m]) => m).join(',')}]::numeric[],
      array[${aumentos.map(([, p]) => p).join(',')}]::numeric[]
    ) with ordinality as t(m, p, i);`

const salidaAumentos = execFileSync(
  'psql',
  [url, '-t', '-A', '-F', '|', '-v', 'ON_ERROR_STOP=1', '-f', '-'],
  { encoding: 'utf8', input: consultaAumentos, maxBuffer: 64 * 1024 * 1024 },
)

const sqlAumentos = new Map(
  salidaAumentos
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((l) => {
      const [i, v] = l.split('|')
      return [Number(i), Number(v)]
    }),
)

for (const [i, [m, p]] of aumentos.entries()) {
  const ts = montoConAumento(m, p)
  const sql = sqlAumentos.get(i)
  if (ts !== sql) {
    fallos++
    console.error(`✗ aumento monto=${m} pct=${p} — TS: ${ts} · SQL: ${sql} (diferencia ${ts - sql})`)
  }
}

const total = casos.length + barrido.length + aumentos.length

if (fallos > 0) {
  console.error(
    `\n${fallos} de ${total} casos divergen. lib/calculo.ts y calcular_cobertura() tienen que coincidir: el wizard muestra el primero y la base congela el segundo.`,
  )
  process.exit(1)
}

console.log(
  `✓ ${total} casos: lib/calculo.ts coincide exactamente con calcular_cobertura() y con la cuenta de aumento_masivo().`,
)
