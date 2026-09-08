import test from 'node:test'
import assert from 'node:assert/strict'

import {
  money,
  numero,
  porcentaje,
  fechaCorta,
  fechaLarga,
  vigenciaTexto,
  diasHasta,
  isoDate,
  iniciales,
  nombreDePila,
  normalizar,
  telefonoWhatsApp,
} from '../lib/formato.ts'

test('money usa el formato del consultorio: $ 128.400', () => {
  assert.equal(money(128400), '$ 128.400')
  assert.equal(money(0), '$ 0')
  assert.equal(money(1000), '$ 1.000')
  assert.equal(money(999), '$ 999')
  assert.equal(money(1234567), '$ 1.234.567')
  // Sin decimales: los montos se manejan en pesos enteros.
  assert.equal(money(1500.6), '$ 1.501')
  // numeric(12,2) llega como string desde Postgres.
  assert.equal(money('48000.00'), '$ 48.000')
  // Nada de "$ NaN" en pantalla.
  assert.equal(money(null), '$ 0')
  assert.equal(money(undefined), '$ 0')
  assert.equal(money('no es un número'), '$ 0')
})

test('numero no lleva símbolo', () => {
  assert.equal(numero(128400), '128.400')
  assert.equal(numero('126000.00'), '126.000')
})

test('porcentaje lleva espacio antes del signo y coma decimal', () => {
  assert.equal(porcentaje(70), '70 %')
  assert.equal(porcentaje(33.5), '33,5 %')
  assert.equal(porcentaje(0), '0 %')
  assert.equal(porcentaje(100), '100 %')
  assert.equal(porcentaje(null), '0 %')
})

test('las fechas salen en es-AR', () => {
  assert.equal(fechaCorta('2026-09-08'), '08/09/2026')
  assert.equal(fechaLarga('2026-09-08'), '8 de septiembre de 2026')
})

test('vigenciaTexto distingue vigente, hoy y vencido', () => {
  const hoy = new Date()
  const enDiez = new Date(hoy)
  enDiez.setDate(hoy.getDate() + 10)
  const haceTres = new Date(hoy)
  haceTres.setDate(hoy.getDate() - 3)

  assert.equal(vigenciaTexto(hoy), 'vence hoy')
  assert.equal(vigenciaTexto(enDiez), 'vence en 10 días')
  assert.equal(vigenciaTexto(haceTres), 'vencido hace 3 días')

  // Singular, no "1 días".
  const mañana = new Date(hoy)
  mañana.setDate(hoy.getDate() + 1)
  assert.equal(vigenciaTexto(mañana), 'vence en 1 día')
})

test('diasHasta e isoDate trabajan en hora local', () => {
  const hoy = new Date()
  assert.equal(diasHasta(hoy), 0)
  assert.match(isoDate(hoy), /^\d{4}-\d{2}-\d{2}$/)
  assert.equal(isoDate(new Date(2026, 8, 8)), '2026-09-08')
})

test('iniciales toma dos letras del formato "Apellido, Nombre"', () => {
  assert.equal(iniciales('Gómez, Renata'), 'GR')
  assert.equal(iniciales('Álvarez, María'), 'ÁM')
  assert.equal(iniciales('Camila'), 'C')
})

test('nombreDePila saca el nombre para el saludo del WhatsApp', () => {
  assert.equal(nombreDePila('Gómez, Renata'), 'Renata')
  assert.equal(nombreDePila('Pereyra, Osvaldo Luis'), 'Osvaldo')
  // Fichas cargadas libres, sin coma.
  assert.equal(nombreDePila('Camila Iriarte'), 'Camila')
  assert.equal(nombreDePila('Camila'), 'Camila')
})

test('normalizar permite buscar sin acentos ni mayúsculas', () => {
  assert.equal(normalizar('Endodoncia'), 'endodoncia')
  assert.equal(normalizar('Álvarez, María'), 'alvarez, maria')
  assert.equal(normalizar('  PRÓTESIS  '), 'protesis')
  // El caso que importa: tipear sin acento tiene que encontrar con acento.
  assert.ok(normalizar('Gómez').includes(normalizar('gomez')))
})

test('telefonoWhatsApp normaliza a formato wa.me', () => {
  assert.equal(telefonoWhatsApp('+54 351 555-0134'), '543515550134')
  assert.equal(telefonoWhatsApp('351 555-0134'), '543515550134')
  // Un 0 inicial es prefijo nacional: se reemplaza por el país.
  assert.equal(telefonoWhatsApp('0351 555-0134'), '543515550134')
  // Paciente sin teléfono o con un dato inservible.
  assert.equal(telefonoWhatsApp(null), null)
  assert.equal(telefonoWhatsApp(''), null)
  assert.equal(telefonoWhatsApp('123'), null)
})
