import fs from 'node:fs'
import { renderToBuffer } from '@react-pdf/renderer'
import { DocumentoPresupuesto } from './documento'
import type { DatosPdf, ItemPdf } from './datos'

const NOMBRES = [
  'Corona de porcelana sobre metal',
  'Endodoncia multirradicular',
  'Restauración con composite',
  'Limpieza y profilaxis',
  'Extracción de tercer molar',
  'Implante de titanio',
  'Blanqueamiento en consultorio',
  'Perno muñón colado',
  'Placa de descarga',
  'Radiografía panorámica',
]
const DESCRIPCIONES = [
  'Incluye tallado, provisorio y colocación definitiva.',
  'Tratamiento de conducto en pieza con más de una raíz.',
  'Restauración estética del sector anterior.',
]

function item(n: number, largo: boolean): ItemPdf {
  const monto = 128400
  const tipo = n % 3 === 0 ? 'ninguna' : n % 3 === 1 ? 'porcentaje' : 'monto'
  const cobertura = tipo === 'porcentaje' ? 89880 : tipo === 'monto' ? 40000 : 0
  return {
    nombre: NOMBRES[(n - 1) % NOMBRES.length],
    codigo: `12.01.${String(n).padStart(2, '0')}`,
    descripcion: largo
      ? 'Descripción larga del snapshot del arancel, tal como se copió al emitir el presupuesto y que puede ocupar dos renglones completos.'
      : DESCRIPCIONES[(n - 1) % DESCRIPCIONES.length],
    detalle: 'pieza 36, cara oclusal',
    monto,
    coberturaTipo: tipo,
    coberturaValor: tipo === 'porcentaje' ? 70 : tipo === 'monto' ? 40000 : 0,
    coberturaMonto: cobertura,
    aCargo: monto - cobertura,
  }
}

function datos(cantidad: number, largo: boolean): DatosPdf {
  const items = Array.from({ length: cantidad }, (_, i) => item(i + 1, largo))
  const totalACargo = items.reduce((a, b) => a + b.aCargo, 0)
  return {
    numero: '2026-0341',
    fechaEmision: '2026-09-08',
    validoHasta: '2026-10-08',
    pacienteNombre: 'Gómez, Renata',
    pacienteDni: '34.123.456',
    obraSocial: 'OSDE 210',
    nroAfiliado: '61234567801',
    profesionalNombre: 'Dra. Ana Pérez',
    profesionalMatricula: '12345',
    items,
    cuotas: [
      { etiqueta: 'Al comenzar el tratamiento', porcentaje: 50, monto: Math.round(totalACargo / 2) },
      { etiqueta: 'A los 30 días', porcentaje: 50, monto: totalACargo - Math.round(totalACargo / 2) },
    ],
    subtotal: items.reduce((a, b) => a + b.monto, 0),
    totalCobertura: items.reduce((a, b) => a + b.coberturaMonto, 0),
    totalACargo,
    observaciones: 'Se recomienda hacer la limpieza antes de arrancar con las restauraciones.',
    consultorio: {
      nombre: 'Smile Lab',
      direccion: 'Av. Colón 1234, Córdoba',
      telefono: '+54 351 000-0000',
      email: 'hola@smilelab.com.ar',
    },
  }
}

function paginas(buffer: Buffer): number {
  const texto = buffer.toString('latin1')
  return (texto.match(/\/Type \/Page[^s]/g) ?? []).length
}

async function main() {
  const salida = process.env.SALIDA as string
  for (const largo of [false, true]) {
    for (let n = 1; n <= 10; n++) {
      const buffer = await renderToBuffer(<DocumentoPresupuesto datos={datos(n, largo)} />)
      if ([3, 6, 8, 9].includes(n)) {
        fs.writeFileSync(`${salida}/pdf-${largo ? 'largo' : 'corto'}-${n}.pdf`, buffer)
      }
      console.log(`${largo ? 'descripción larga' : 'descripción corta'} · ${String(n).padStart(2)} ítems → ${paginas(buffer)} pág · ${buffer.byteLength} bytes`)
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
