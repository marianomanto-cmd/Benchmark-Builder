/**
 * Que nada le hable en inglés a quien está atendiendo.
 *
 * Los schemas de las server actions llevan mensaje escrito a mano en
 * cada regla que se toca desde la pantalla. Este test cuida la red de
 * abajo: que las reglas SIN mensaje propio —las que nadie pensó que se
 * podían tocar— también salgan en castellano.
 */

import assert from 'node:assert/strict'
import test from 'node:test'

import { z } from '../lib/zod.ts'

test('el locale de zod está en castellano', () => {
  const schema = z.object({
    id: z.uuid(),
    texto: z.string().max(3),
    numero: z.number().max(10),
    lista: z.array(z.string()).min(1),
  })

  const r = schema.safeParse({ id: 'no-es-uuid', texto: 'largo', numero: 99, lista: [] })
  assert.ok(!r.success)

  for (const issue of r.error.issues) {
    assert.ok(
      !/expected|invalid|too big|too small|received/i.test(issue.message),
      `mensaje en inglés: "${issue.message}" (${String(issue.path[0])})`,
    )
  }
})

test('un mensaje escrito a mano le gana al locale', () => {
  const schema = z.string().min(1, 'Cada prestación necesita un nombre.')
  const r = schema.safeParse('')
  assert.ok(!r.success)
  assert.equal(r.error.issues[0]?.message, 'Cada prestación necesita un nombre.')
})
