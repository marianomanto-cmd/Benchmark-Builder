/**
 * Cómo escribe la gente cuando busca.
 *
 * Los casos salen de datos reales del consultorio: los pacientes se
 * guardan «Apellido, Nombre», la mitad lleva tilde, y los DNI se
 * guardan con puntos y se tipean sin ellos.
 */

import assert from 'node:assert/strict'
import test from 'node:test'

import { coincide, palabrasBusqueda, patronDeDigitos } from '../lib/busqueda.ts'

test('el término se parte en palabras normalizadas', () => {
  assert.deepEqual(palabrasBusqueda('Gómez, Renata'), ['gomez', 'renata'])
  assert.deepEqual(palabrasBusqueda('  OSDE   210 '), ['osde', '210'])
  assert.deepEqual(palabrasBusqueda(''), [])
  // Los metacaracteres de PostgREST y los comodines de `like` no viajan.
  assert.deepEqual(palabrasBusqueda('100% (a)'), ['100', 'a'])
})

test('encuentra al paciente escriba como escriba', () => {
  const ficha = 'Gómez, Renata DNI 32.114.556 · OSDE 210'
  for (const q of [
    'Gomez',
    'gómez',
    'gomez renata',
    'Renata Gomez',
    'Gómez, Renata',
    '32114556',
    '32.114.556',
    'osde',
  ]) {
    assert.ok(coincide(ficha, q), `no encontró con «${q}»`)
  }
  assert.ok(!coincide(ficha, 'Pereyra'))
  assert.ok(!coincide(ficha, 'gomez pereyra'), 'las palabras se exigen todas')
})

test('el patrón intercalado es sólo para dígitos pelados', () => {
  assert.equal(patronDeDigitos('32114556'), '%3%2%1%1%4%5%5%6%')
  // Con separadores la persona ya sabe la forma exacta: el patrón
  // intercalado le calzaría a casi cualquier número y traía 40
  // presupuestos donde hay 1.
  assert.equal(patronDeDigitos('2026-0003'), null)
  assert.equal(patronDeDigitos('32.114.556'), null)
  assert.equal(patronDeDigitos('12'), null)
  assert.equal(patronDeDigitos('gomez'), null)
})
