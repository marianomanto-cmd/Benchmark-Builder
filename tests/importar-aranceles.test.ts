import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { readSheet } from 'read-excel-file/node'

import {
  claveCatalogo,
  contarPorEstado,
  leerPlanilla,
  normalizarPlan,
  parsearMonto,
  prolijarRubro,
  sospechas,
  variacion,
} from '../lib/importar-aranceles.ts'

const aqui = dirname(fileURLToPath(import.meta.url))

/* ── Precios ────────────────────────────────────────────── */

test('parsearMonto lee el formato de EE.UU. que exporta Google Sheets', () => {
  assert.equal(parsearMonto('$45,000.00').monto, 45000)
  assert.equal(parsearMonto('$78,000').monto, 78000)
  assert.equal(parsearMonto('$1,007,500.00').monto, 1007500)
})

test('parsearMonto lee el formato argentino', () => {
  assert.equal(parsearMonto('$ 45.000').monto, 45000)
  assert.equal(parsearMonto('45.000,00').monto, 45000)
  assert.equal(parsearMonto('1.250.000').monto, 1250000)
  assert.equal(parsearMonto('ARS 95.000').monto, 95000)
  assert.equal(parsearMonto('95000 pesos').monto, 95000)
})

test('parsearMonto entiende el «.-» argentino y no lo toma por negativo', () => {
  assert.equal(parsearMonto('$ 45.000.-').monto, 45000)
  assert.equal(parsearMonto('45.000,-').monto, 45000)
  assert.equal(parsearMonto('$45000-').monto, 45000)
  assert.match(parsearMonto('-$ 500').problema ?? '', /negativo/)
  assert.match(parsearMonto('$-500').problema ?? '', /negativo/)
})

test('parsearMonto toma los números tal cual', () => {
  assert.equal(parsearMonto(300000).monto, 300000)
  assert.equal(parsearMonto(1007500).monto, 1007500)
  // Ruido de una fórmula: no son centavos.
  const formula = parsearMonto(1007499.9999999)
  assert.equal(formula.monto, 1007500)
  assert.equal(formula.nota, null)
})

test('parsearMonto no adivina ceros: $800.00 son ochocientos pesos', () => {
  const r = parsearMonto('$800.00')
  assert.equal(r.monto, 800)
  assert.equal(r.problema, null)
})

test('parsearMonto: tres dígitos después del separador son miles en las dos convenciones', () => {
  assert.equal(parsearMonto('45,000').monto, 45000)
  assert.equal(parsearMonto('45.000').monto, 45000)
  assert.equal(parsearMonto('800,5').monto, 801)
})

test('parsearMonto redondea los centavos y lo avisa', () => {
  const r = parsearMonto('$1.234,56')
  assert.equal(r.monto, 1235)
  assert.match(r.nota ?? '', /redondeó/)
})

test('parsearMonto rechaza lo que no es un precio', () => {
  assert.equal(parsearMonto(null).problema, 'Falta el precio')
  assert.equal(parsearMonto('   ').problema, 'Falta el precio')
  assert.match(parsearMonto('a convenir').problema ?? '', /No es un precio/)
  assert.match(parsearMonto('$ -500').problema ?? '', /negativo/)
  assert.match(parsearMonto('(500)').problema ?? '', /negativo/)
  assert.match(parsearMonto('1.234,5.6').problema ?? '', /No se entiende/)
  assert.match(parsearMonto(true).problema ?? '', /no tiene un número/)
  assert.match(parsearMonto(5e12).problema ?? '', /demasiado grande/)
})

/* ── Rubros y claves ────────────────────────────────────── */

test('prolijarRubro pasa a oración lo que viene en mayúsculas y respeta lo demás', () => {
  assert.equal(prolijarRubro('PROTESIS Y REHABILITACION'), 'Protesis y rehabilitacion')
  assert.equal(prolijarRubro('ODONTOPEDIATRÍA'), 'Odontopediatría')
  assert.equal(prolijarRubro('Consulta'), 'Consulta')
  assert.equal(prolijarRubro('  Cirugía   maxilofacial '), 'Cirugía maxilofacial')
})

test('claveCatalogo iguala lo que se escribe distinto', () => {
  assert.equal(claveCatalogo('Limpieza (sola)'), claveCatalogo('LIMPIEZA  sola'))
  assert.equal(claveCatalogo('Flúor + certificado'), claveCatalogo('fluor+certificado'))
  assert.notEqual(claveCatalogo('Endodoncia premolar'), claveCatalogo('Endodoncia molar'))
})

/* ── La planilla ────────────────────────────────────────── */

test('leerPlanilla encuentra los encabezados aunque no estén en la primera fila', () => {
  const r = leerPlanilla([
    ['Lista de precios octubre'],
    [],
    ['Rubro', 'Prestación', 'Precio'],
    ['Cirugía', 'Extracción simple', '$100,000.00'],
  ])
  assert.equal(r.ok, true)
  if (!r.ok) return
  assert.equal(r.planilla.filaEncabezado, 3)
  assert.deepEqual(r.planilla.filas[0], {
    fila: 4,
    rubro: 'Cirugía',
    nombre: 'Extracción simple',
    monto: 100000,
    textoPrecio: '$100,000.00',
    problema: null,
    nota: null,
  })
})

test('leerPlanilla prefiere la columna Efectivo y lista las que ignora', () => {
  const r = leerPlanilla([
    ['Tipo', 'Subtipo', 'Precio de lista', 'Tarjeta', 'Efectivo'],
    ['Consulta', 'Consulta odontológica', 99, 50000, 45000],
  ])
  assert.equal(r.ok, true)
  if (!r.ok) return
  assert.equal(r.planilla.columnas.precio, 'Efectivo')
  assert.equal(r.planilla.filas[0].monto, 45000)
  assert.deepEqual(r.planilla.ignoradas, ['Precio de lista', 'Tarjeta'])
})

test('leerPlanilla sin encabezados reconocibles lo dice', () => {
  const r = leerPlanilla([
    ['Consulta', 'Consulta odontológica', 45000],
    ['Consulta', 'Limpieza', 80000],
  ])
  assert.equal(r.ok, false)
  if (r.ok) return
  assert.match(r.error, /Tipo, Subtipo y Efectivo/)
})

test('leerPlanilla con encabezados y sin filas lo dice', () => {
  const r = leerPlanilla([['Tipo', 'Subtipo', 'Efectivo'], [], [null, null, null]])
  assert.equal(r.ok, false)
})

test('leerPlanilla lee la planilla de ejemplo con todas sus mañas', async () => {
  const celdas = await readSheet(readFileSync(join(aqui, 'fixtures', 'planilla-aranceles.xlsx')))
  const r = leerPlanilla(celdas)
  assert.equal(r.ok, true)
  if (!r.ok) return

  const { filas, ignoradas, columnas } = r.planilla
  assert.deepEqual(columnas, { tipo: 'Tipo', subtipo: 'Subtipo', precio: 'Efectivo' })
  assert.deepEqual(ignoradas, ['Tarjeta'])

  const por = new Map(filas.map((f) => [f.nombre, f]))

  // «Consulta» y «CONSULTA» son el mismo rubro: gana la primera grafía.
  assert.equal(por.get('Limpieza (sola)')?.rubro, 'Consulta')
  // Celda combinada: la fila de abajo hereda el Tipo.
  assert.equal(por.get('Consulta + limpieza')?.rubro, 'Consulta')
  assert.equal(por.get('Consulta + limpieza')?.monto, 95000)
  // Título de grupo en su propia fila: no se importa, pero da el rubro.
  assert.equal(por.has(''), true, 'la fila sin subtipo con precio sí se reporta')
  assert.equal(por.get('Endodoncia premolar')?.rubro, 'Endodoncia')
  assert.equal(por.get('Endodoncia premolar')?.monto, 285000)
  // Mayúsculas a oración.
  assert.equal(por.get('Perno de fibra de vidrio')?.rubro, 'Protesis y rehabilitacion')
  assert.equal(por.get('Implantes')?.monto, 1007500)
  // El precio sin ceros se lee como lo que dice.
  assert.equal(por.get('Corona de zirconio + reconstrucción')?.monto, 800)

  assert.equal(por.get('')?.problema, 'Falta el subtipo')
  assert.match(por.get('Extracción simple')?.problema ?? '', /No es un precio/)

  // Las filas vacías y el título de grupo no cuentan.
  assert.equal(filas.length, 9)
  assert.deepEqual(
    filas.map((f) => f.fila),
    [2, 3, 4, 6, 8, 9, 10, 11, 12],
  )
})

/* ── Sospechas ──────────────────────────────────────────── */

test('sospechas marca el precio que perdió los ceros', () => {
  assert.equal(sospechas(800, null).length, 1)
  assert.equal(sospechas(800, 750000).length, 2)
  assert.deepEqual(sospechas(780000, 750000), [])
})

test('sospechas marca saltos de más del doble o de menos de la mitad', () => {
  assert.match(sospechas(1_600_000, 750000)[0], /duplica/)
  assert.match(sospechas(300000, 750000)[0], /mitad/)
  assert.deepEqual(sospechas(1_500_000, 750000), [])
  assert.deepEqual(sospechas(375000, 750000), [])
})

test('variacion en porcentaje, y null sin precio de hoy', () => {
  assert.equal(variacion(110, 100), 10)
  assert.equal(variacion(100, null), null)
  assert.equal(variacion(100, 0), null)
})

/* ── El plan de la base ─────────────────────────────────── */

test('normalizarPlan convierte numeric y fechas, y cuenta por estado', () => {
  const plan = normalizarPlan({
    desde: '2026-10-12',
    aplicado: false,
    filas: [
      {
        fila: 2,
        nombre: 'Endodoncia premolar',
        rubro: 'Endodoncia',
        monto: '285000',
        estado: 'actualizar',
        previsto: 'actualizar',
        mensaje: null,
        avisos: [],
        prestacion_id: 'a',
        prestacion: 'Endodoncia premolar',
        rubro_biblioteca: 'Endodoncia',
        activa: true,
        monto_actual: '250000.00',
        desde_actual: '2026-09-01T00:00:00',
        usos: 3,
        emitido_el: null,
      },
      { fila: 3, nombre: 'X', estado: 'raro', avisos: null },
    ],
  })
  assert.ok(plan)
  if (!plan) return
  assert.equal(plan.filas[0].monto, 285000)
  assert.equal(plan.filas[0].monto_actual, 250000)
  assert.equal(plan.filas[0].desde_actual, '2026-09-01')
  assert.equal(plan.filas[1].estado, 'error', 'un estado desconocido no se escribe')
  assert.deepEqual(plan.filas[1].avisos, [])
  const conteo = contarPorEstado(plan.filas)
  assert.equal(conteo.actualizar, 1)
  assert.equal(conteo.error, 1)
  assert.equal(normalizarPlan(null), null)
})
