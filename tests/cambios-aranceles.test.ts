import test from 'node:test'
import assert from 'node:assert/strict'

import {
  describirCambio,
  normalizarFoto,
  type CambioArancel,
  type FotoArancel,
} from '../lib/cambios-aranceles.ts'

/** El espacio de `money()` es duro. */
const D = ' '

const base: FotoArancel = {
  monto: 750000,
  cobertura_tipo: 'ninguna',
  cobertura_valor: 0,
  vigente_desde: '2026-09-01',
  vigente_hasta: null,
}

function cambio(parcial: Partial<CambioArancel>): CambioArancel {
  return {
    id: 'c',
    arancel_id: 'a',
    accion: 'edicion',
    origen: 'correccion',
    motivo: null,
    antes: base,
    despues: base,
    autor_nombre: 'Álvarez, María',
    created_at: '2026-10-12T14:32:00Z',
    ...parcial,
  }
}

test('un alta dice el precio y desde cuándo, con su origen', () => {
  assert.equal(
    describirCambio(cambio({ accion: 'alta', origen: 'vigencia', antes: null })),
    `Se cargó $${D}750.000 desde el 01/09/2026`,
  )
  assert.equal(
    describirCambio(cambio({ accion: 'alta', origen: 'excel', antes: null })),
    `Excel: $${D}750.000 desde el 01/09/2026`,
  )
})

test('una corrección muestra el antes y el después', () => {
  assert.equal(
    describirCambio(cambio({ antes: { ...base, monto: 800 } })),
    `Corrección: $${D}800 → $${D}750.000`,
  )
  assert.equal(
    describirCambio(
      cambio({ despues: { ...base, cobertura_tipo: 'porcentaje', cobertura_valor: 40 } }),
    ),
    `Corrección: $${D}750.000 · cobertura sin cobertura → 40 %`,
  )
})

test('el cierre por una vigencia nueva y la reapertura por un borrado', () => {
  assert.equal(
    describirCambio(cambio({ origen: 'vigencia', despues: { ...base, vigente_hasta: '2026-09-30' } })),
    `$${D}750.000 · se cerró el 30/09/2026`,
  )
  assert.equal(
    describirCambio(
      cambio({ origen: 'baja', antes: { ...base, vigente_hasta: '2026-09-30' }, despues: base }),
    ),
    `$${D}750.000 · vuelve a regir sin fecha de fin`,
  )
})

test('una baja dice qué se borró', () => {
  assert.equal(
    describirCambio(
      cambio({ accion: 'baja', origen: 'baja', despues: null, antes: { ...base, monto: 800 } }),
    ),
    `Se borró $${D}800 (desde el 01/09/2026)`,
  )
})

test('normalizarFoto convierte el jsonb del registro', () => {
  assert.deepEqual(
    normalizarFoto({
      monto: '800000.00',
      cobertura_tipo: 'monto',
      cobertura_valor: '30000',
      vigente_desde: '2026-10-01',
      vigente_hasta: null,
      id: 'x',
    }),
    {
      monto: 800000,
      cobertura_tipo: 'monto',
      cobertura_valor: 30000,
      vigente_desde: '2026-10-01',
      vigente_hasta: null,
    },
  )
  assert.equal(normalizarFoto(null), null)
})
