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
  matricula,
  fechaHora,
  hora,
  haceCuanto,
  diasDesde,
  anio,
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

test('telefonoWhatsApp arma el celular argentino que acepta wa.me', () => {
  // WhatsApp necesita 54 + 9 + área + abonado, sin el 15 ni el 0.
  const esperado = '5493515550134'

  assert.equal(telefonoWhatsApp('+54 9 351 555-0134'), esperado, 'ya venía completo')
  assert.equal(telefonoWhatsApp('+54 351 555-0134'), esperado, 'faltaba el 9')
  assert.equal(telefonoWhatsApp('351 555-0134'), esperado, 'sin país')
  assert.equal(telefonoWhatsApp('0351 555-0134'), esperado, 'con 0 de larga distancia')
  assert.equal(telefonoWhatsApp('0351 15 555-0134'), esperado, 'con 0 y con 15')
  assert.equal(telefonoWhatsApp('351 155550134'), esperado, 'con 15 pegado')
  assert.equal(telefonoWhatsApp('00 54 9 351 5550134'), esperado, 'internacional a mano')
  assert.equal(telefonoWhatsApp('(351) 555-0134'), esperado, 'con paréntesis')

  // Buenos Aires: área de 2 dígitos.
  assert.equal(telefonoWhatsApp('011 15 4123-4567'), '5491141234567')
  // Área de 4 dígitos.
  assert.equal(telefonoWhatsApp('02954 15 123456'), '5492954123456')

  // Paciente sin teléfono o con un dato inservible: quien llama tiene
  // que ofrecer cargarlo, no abrir un chat roto.
  assert.equal(telefonoWhatsApp(null), null)
  assert.equal(telefonoWhatsApp(undefined), null)
  assert.equal(telefonoWhatsApp(''), null)
  assert.equal(telefonoWhatsApp('sin teléfono'), null)
  assert.equal(telefonoWhatsApp('123'), null)
})

test('matricula no repite el prefijo que ya trae cargado', () => {
  // El caso que se veía en la cabecera del detalle y en la firma del PDF.
  assert.equal(matricula('MP 34.567'), 'MP 34.567')
  assert.equal(matricula('mp 34.567'), 'mp 34.567')
  assert.equal(matricula('M.P. 34.567'), 'M.P. 34.567')

  // Matrícula nacional: prefijarla con MP sería decir otra cosa.
  assert.equal(matricula('MN 12.345'), 'MN 12.345')

  // Cargada como número pelado, que es lo más común.
  assert.equal(matricula('34.567'), 'MP 34.567')
  assert.equal(matricula('  34567 '), 'MP 34567')

  // Sin matrícula no se firma con una vacía.
  assert.equal(matricula(null), null)
  assert.equal(matricula(undefined), null)
  assert.equal(matricula('   '), null)
})

test('las fechas nunca tiran: un campo vaciado no se lleva puesta la pantalla', () => {
  // El caso real: `<input type="date">` vaciado con Backspace manda ''.
  // Antes esto era `RangeError: Invalid time value` desde date-fns y
  // el error subía hasta el boundary con el wizard a medio cargar.
  for (const malo of ['', '  ', 'no-es-fecha', '2026-13-45', null, undefined]) {
    assert.equal(fechaLarga(malo as never), '—', `fechaLarga(${String(malo)})`)
    assert.equal(fechaHora(malo as never), '—', `fechaHora(${String(malo)})`)
    assert.equal(hora(malo as never), '—', `hora(${String(malo)})`)
    assert.equal(haceCuanto(malo as never), '—', `haceCuanto(${String(malo)})`)
    assert.equal(vigenciaTexto(malo as never), '—', `vigenciaTexto(${String(malo)})`)
    // Los que devuelven número no pueden devolver NaN: se usan para comparar.
    assert.equal(diasDesde(malo as never), 0, `diasDesde(${String(malo)})`)
    assert.ok(Number.isFinite(anio(malo as never)), `anio(${String(malo)})`)
  }

  // Y con una fecha buena siguen diciendo lo de siempre.
  assert.equal(fechaLarga('2026-09-08'), '8 de septiembre de 2026')
  assert.equal(diasDesde('2026-09-08') >= 0, true)
})
