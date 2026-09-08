import test from 'node:test'
import assert from 'node:assert/strict'

import {
  ESTADOS,
  ESTADOS_PIPELINE,
  ESTADOS_COLUMNA,
  ESTILO_ESTADO,
  ETIQUETA_ESTADO,
  ETIQUETA_MOTIVO,
  MOTIVOS,
  transicionesSugeridas,
  puedeMarcarsePerdido,
  estaCerrado,
  esperaRespuesta,
  esEditable,
  estaFrio,
  DIAS_SIN_RESPUESTA,
} from '../lib/estados.ts'

test('los ocho estados tienen etiqueta y estilo', () => {
  assert.equal(ESTADOS.length, 8)
  for (const e of ESTADOS) {
    assert.ok(ETIQUETA_ESTADO[e], `falta etiqueta de ${e}`)
    assert.ok(ESTILO_ESTADO[e], `falta estilo de ${e}`)
    // El color nunca es el único portador de significado: siempre hay punto.
    assert.match(ESTILO_ESTADO[e].punto, /^#[0-9A-F]{6}$/i, `punto inválido en ${e}`)
    assert.match(ESTILO_ESTADO[e].texto, /^#[0-9A-F]{6}$/i, `texto inválido en ${e}`)
  }
})

test('el kanban tiene cinco columnas y perdido no es una de ellas', () => {
  assert.equal(ESTADOS_PIPELINE.length, 5)
  assert.ok(!ESTADOS_PIPELINE.includes('perdido'), 'perdido va al pie, no como columna')
  assert.ok(!ESTADOS_PIPELINE.includes('borrador'), 'un borrador todavía no está en juego')
  assert.equal(Object.keys(ESTADOS_COLUMNA).length, 5)
  // Aceptado e iniciado comparten columna.
  assert.deepEqual(ESTADOS_COLUMNA.aceptado, ['aceptado', 'iniciado'])
})

test('cada estado del pipeline mapea a alguna columna', () => {
  const enColumnas = Object.values(ESTADOS_COLUMNA).flat()
  for (const e of ESTADOS_PIPELINE) {
    assert.ok(enColumnas.includes(e), `${e} no aparece en ninguna columna`)
  }
})

test('los cinco motivos de pérdida tienen etiqueta', () => {
  assert.equal(MOTIVOS.length, 5)
  for (const m of MOTIVOS) {
    assert.ok(ETIQUETA_MOTIVO[m], `falta etiqueta de ${m}`)
  }
  assert.equal(ETIQUETA_MOTIVO.otro_lugar, 'Se atendió en otro lugar')
})

test('las transiciones sugeridas avanzan el embudo', () => {
  assert.deepEqual(transicionesSugeridas('borrador'), ['realizado'])
  assert.deepEqual(transicionesSugeridas('realizado'), ['enviado'])
  assert.deepEqual(transicionesSugeridas('aceptado'), ['iniciado'])
  // Iniciado es el final del camino feliz.
  assert.deepEqual(transicionesSugeridas('iniciado'), [])
  // Perdido no se reabre como flujo principal: se ofrece duplicar.
  assert.deepEqual(transicionesSugeridas('perdido'), ['interesado'])
})

test('ninguna transición sugerida vuelve a borrador', () => {
  // Volver a borrador reabriría los ítems a edición y rompería el snapshot.
  for (const e of ESTADOS) {
    if (e === 'borrador') continue
    assert.ok(
      !transicionesSugeridas(e).includes('borrador'),
      `${e} no puede sugerir volver a borrador`,
    )
  }
})

test('sólo se pierde lo que está en juego', () => {
  assert.equal(puedeMarcarsePerdido('enviado'), true)
  assert.equal(puedeMarcarsePerdido('interesado'), true)
  assert.equal(puedeMarcarsePerdido('perdido'), false, 'ya está perdido')
  assert.equal(puedeMarcarsePerdido('borrador'), false, 'todavía no se emitió')
  assert.equal(puedeMarcarsePerdido('iniciado'), false, 'el tratamiento ya arrancó')
})

test('estaCerrado marca lo que ya no está en juego', () => {
  assert.equal(estaCerrado('perdido'), true)
  assert.equal(estaCerrado('iniciado'), true)
  assert.equal(estaCerrado('aceptado'), false)
  assert.equal(estaCerrado('enviado'), false)
})

test('sólo un borrador es editable', () => {
  assert.equal(esEditable('borrador'), true)
  for (const e of ESTADOS.filter((x) => x !== 'borrador')) {
    assert.equal(esEditable(e), false, `${e} no debería ser editable`)
  }
})

test('estaFrio se dispara pasados los 7 días esperando respuesta', () => {
  assert.equal(DIAS_SIN_RESPUESTA, 7)
  assert.equal(esperaRespuesta('enviado'), true)
  assert.equal(esperaRespuesta('pendiente'), true)
  assert.equal(esperaRespuesta('interesado'), false)

  assert.equal(estaFrio('enviado', 7), false, 'a los 7 justos todavía no')
  assert.equal(estaFrio('enviado', 8), true)
  assert.equal(estaFrio('pendiente', 30), true)
  // Un aceptado con 30 días no está frío: ya contestó.
  assert.equal(estaFrio('aceptado', 30), false)
})
