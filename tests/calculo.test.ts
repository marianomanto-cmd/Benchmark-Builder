import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import {
  calcularItem,
  calcularTotales,
  repartirCuotas,
  cuotasSuman100,
  compararConHoy,
  montoConAumento,
  type CoberturaTipo,
} from '../lib/calculo.ts'

const aqui = dirname(fileURLToPath(import.meta.url))
const fixture = JSON.parse(readFileSync(join(aqui, 'casos-cobertura.json'), 'utf8')) as {
  casos: {
    monto: number
    tipo: CoberturaTipo
    valor: number
    cobertura: number
    aCargo: number
    nota: string
  }[]
}

test('calcularItem coincide con los casos compartidos con SQL', async (t) => {
  for (const c of fixture.casos) {
    await t.test(`${c.monto} · ${c.tipo} ${c.valor} — ${c.nota}`, () => {
      const r = calcularItem(c.monto, c.tipo, c.valor)
      assert.equal(r.cobertura, c.cobertura, 'cobertura')
      assert.equal(r.aCargo, c.aCargo, 'a cargo')
    })
  }
})

test('la cobertura nunca supera el monto ni queda negativa', () => {
  for (const monto of [0, 1, 999, 48000, 720000]) {
    for (const tipo of ['porcentaje', 'monto', 'ninguna'] as CoberturaTipo[]) {
      for (const valor of [0, 1, 33.3, 50, 100, 999999]) {
        const { cobertura, aCargo } = calcularItem(monto, tipo, valor)
        assert.ok(cobertura >= 0, `cobertura negativa en ${monto}/${tipo}/${valor}`)
        assert.ok(cobertura <= monto, `cobertura > monto en ${monto}/${tipo}/${valor}`)
        assert.ok(aCargo >= 0, `a cargo negativo en ${monto}/${tipo}/${valor}`)
        assert.equal(cobertura + aCargo, monto, `no cierra en ${monto}/${tipo}/${valor}`)
      }
    }
  }
})

test('calcularTotales suma línea por línea', () => {
  const t = calcularTotales([
    { monto: 126000, cobertura_tipo: 'porcentaje', cobertura_valor: 60 },
    { monto: 350000, cobertura_tipo: 'porcentaje', cobertura_valor: 40 },
    { monto: 22000, cobertura_tipo: 'ninguna', cobertura_valor: 0 },
  ])
  assert.equal(t.subtotal, 498000)
  assert.equal(t.cobertura, 75600 + 140000)
  assert.equal(t.aCargo, 498000 - (75600 + 140000))
  assert.equal(t.cobertura + t.aCargo, t.subtotal)
})

test('calcularTotales con lista vacía da ceros', () => {
  assert.deepEqual(calcularTotales([]), { subtotal: 0, cobertura: 0, aCargo: 0 })
})

test('repartirCuotas cierra exacto contra el total', () => {
  // La última cuota absorbe el resto: es la misma regla que aplica
  // crear_presupuesto() en la base.
  const casos: [number, number[]][] = [
    [260400, [50, 50]],
    [100000, [30, 30, 40]],
    [99999, [33.33, 33.33, 33.34]],
    [1, [50, 50]],
    [0, [50, 50]],
    [55201, [70, 30]],
  ]
  for (const [total, pcts] of casos) {
    const cuotas = repartirCuotas(total, pcts)
    assert.equal(cuotas.length, pcts.length)
    assert.equal(
      cuotas.reduce((a, b) => a + b, 0),
      total,
      `las cuotas de ${total} con ${pcts.join('/')} no cierran`,
    )
  }
})

test('repartirCuotas sin cuotas devuelve lista vacía', () => {
  assert.deepEqual(repartirCuotas(100000, []), [])
})

test('cuotasSuman100 tolera el redondeo de los tercios', () => {
  assert.equal(cuotasSuman100([50, 50]), true)
  assert.equal(cuotasSuman100([33.33, 33.33, 33.34]), true)
  assert.equal(cuotasSuman100([]), true, 'sin cuotas es válido')
  assert.equal(cuotasSuman100([50, 40]), false)
  assert.equal(cuotasSuman100([60, 60]), false)
})

test('compararConHoy detecta el precio desactualizado', () => {
  const snapshot = [{ monto: 126000, cobertura_tipo: 'porcentaje' as const, cobertura_valor: 60 }]
  const hoy = [{ monto: 145000, cobertura_tipo: 'porcentaje' as const, cobertura_valor: 60 }]

  const c = compararConHoy(snapshot, hoy)
  assert.equal(c.desactualizado, true)
  assert.equal(c.aCargoSnapshot, 50400)
  assert.equal(c.aCargoHoy, 58000)
  assert.equal(c.diferencia, 7600)

  // Mismo arancel: no hay banner que mostrar.
  const igual = compararConHoy(snapshot, snapshot)
  assert.equal(igual.desactualizado, false)
  assert.equal(igual.diferencia, 0)
})

test('montoConAumento coincide con la cuenta de aumento_masivo()', () => {
  assert.equal(montoConAumento(48000, 10), 52800)
  assert.equal(montoConAumento(48000, 15), 55200)
  assert.equal(montoConAumento(66000, 15), 75900)
  assert.equal(montoConAumento(48000, 20), 57600)
  assert.equal(montoConAumento(126000, 0), 126000, 'sin aumento no cambia')

  // El caso que separaba al preview de la RPC: `monto * (1 + pct/100)`
  // en punto flotante daba 769961 y la base escribía 769962.
  assert.equal(montoConAumento(385000, 99.99), 769962)
  assert.equal(montoConAumento(126000, 33.33), 167996)

  // Un aumento nunca puede bajar el precio.
  for (const monto of [1, 999, 48000, 385000, 999999]) {
    for (const pct of [0, 1, 12.5, 15, 33.33, 99.99, 100]) {
      assert.ok(
        montoConAumento(monto, pct) >= monto,
        `${monto} con +${pct} % quedó por debajo del original`,
      )
    }
  }
})
