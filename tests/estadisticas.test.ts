import test from 'node:test'
import assert from 'node:assert/strict'

import {
  caidaEmbudo,
  dias,
  mesCorto,
  techoEje,
  variacion,
  ventanaRango,
} from '../lib/estadisticas.ts'

test('ventanaRango arranca en el primer día del mes, no «hoy menos N»', () => {
  const hoy = '2026-09-10'

  // 3 meses = julio, agosto y septiembre. El mes en curso cuenta.
  assert.deepEqual(ventanaRango('3m', hoy), { desde: '2026-07-01', hasta: '2026-09-10' })
  assert.deepEqual(ventanaRango('12m', hoy), { desde: '2025-10-01', hasta: '2026-09-10' })

  // Si arrancara a mitad de mes, el primer punto de la serie saldría
  // con menos días que el resto y se leería como una caída.
  assert.equal(ventanaRango('6m', hoy).desde, '2026-04-01')

  assert.equal(ventanaRango('todo', hoy).desde, '2000-01-01')
})

test('ventanaRango cruza el año para atrás sin romperse', () => {
  const enero = '2026-01-05'
  assert.equal(ventanaRango('3m', enero).desde, '2025-11-01')
  assert.equal(ventanaRango('12m', enero).desde, '2025-02-01')
})

test('caidaEmbudo mide contra la última etapa con gente, no contra la vacía', () => {
  const etapas = [
    { estado: 'realizado' as const, alcanzaron: 100, monto: 0 },
    { estado: 'enviado' as const, alcanzaron: 60, monto: 0 },
    // «pendiente» es automático: se puede saltear entero.
    { estado: 'pendiente' as const, alcanzaron: 0, monto: 0 },
    { estado: 'interesado' as const, alcanzaron: 30, monto: 0 },
  ]

  const r = caidaEmbudo(etapas)
  assert.equal(r[0].pctDelTotal, 100)
  assert.equal(r[0].pctDeLaAnterior, null, 'la primera no tiene contra qué comparar')
  assert.equal(r[1].pctDeLaAnterior, 60)
  // Con la etapa vacía en el medio, comparar contra ella daba 0 % y
  // después un crecimiento infinito.
  assert.equal(r[3].pctDeLaAnterior, 50, 'interesado se mide contra enviado')
  assert.equal(r[3].pctDelTotal, 30)
})

test('caidaEmbudo sin datos no divide por cero', () => {
  const r = caidaEmbudo([{ estado: 'realizado', alcanzaron: 0, monto: 0 }])
  assert.equal(r[0].pctDelTotal, 0)
  assert.equal(r[0].pctDeLaAnterior, null)
})

test('techoEje sube a un número que se puede leer', () => {
  assert.equal(techoEje(37), 50)
  assert.equal(techoEje(8), 10)
  assert.equal(techoEje(12), 20)
  assert.equal(techoEje(21), 25)
  assert.equal(techoEje(1), 1)
  assert.equal(techoEje(180000), 200000)
  // Un eje sin datos igual tiene que medir algo.
  assert.equal(techoEje(0), 1)
  assert.equal(techoEje(-5), 1)
  assert.equal(techoEje(Number.NaN), 1)
})

test('variacion no inventa un porcentaje cuando no había base', () => {
  assert.equal(variacion(15, 10), 50)
  assert.equal(variacion(5, 10), -50)
  assert.equal(variacion(10, 10), 0)
  // Pasar de 0 a 5 no es «+500 %»: antes no había nada.
  assert.equal(variacion(5, 0), null)
})

test('mesCorto y dias hablan en castellano', () => {
  assert.equal(mesCorto('2026-09-01'), 'sept')
  assert.equal(dias(1), '1 día')
  assert.equal(dias(5), '5 días')
  assert.equal(dias(1.5), '1,5 días')
  assert.equal(dias(null), '—')
})

test('ventanaRango trabaja sobre el día del consultorio, no sobre la zona del servidor', () => {
  // El caso que rompía: en Vercel el server corre en UTC, así que un
  // `new Date()` de las 22:00 argentinas ya es el día siguiente allá.
  // Pasando el ISO del consultorio, la ventana no se corre un mes.
  assert.equal(ventanaRango('3m', '2026-03-01').desde, '2026-01-01')
  assert.equal(ventanaRango('1m' as never, '2026-03-01').desde, '2000-01-01')
})
