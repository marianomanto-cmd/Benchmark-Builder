/**
 * Registro de las tipografías de marca para el PDF.
 *
 * `@react-pdf/renderer` usa fontkit, que lee TTF/OTF pero **no** lee
 * WOFF2. Por eso los archivos de `public/fonts/` son los `.ttf` crudos
 * que sirve `fonts.gstatic.com` (se bajan pidiendo el CSS de Google
 * Fonts sin User-Agent moderno: con un UA nuevo devuelve WOFF2 y con
 * uno de IE6 devuelve EOT; el default de curl devuelve TrueType).
 *
 * Si por lo que sea los archivos no están en el filesystem del server
 * (por ejemplo, un deploy que no incluyó `public/` en el bundle de la
 * función), no se registra nada y el documento cae a Helvetica, que
 * viene embebida en el PDF por especificación. El presupuesto se
 * genera igual: es un documento que el consultorio necesita mandar, no
 * puede fallar por una tipografía.
 */

import fs from 'node:fs'
import path from 'node:path'

import { Font } from '@react-pdf/renderer'

const DIRECTORIO = path.join(process.cwd(), 'public', 'fonts')

const ARCHIVOS = {
  soraSemiBold: 'Sora-SemiBold.ttf',
  manropeRegular: 'Manrope-Regular.ttf',
  manropeMedium: 'Manrope-Medium.ttf',
  manropeSemiBold: 'Manrope-SemiBold.ttf',
} as const

function ruta(archivo: string): string {
  return path.join(DIRECTORIO, archivo)
}

function hayArchivos(): boolean {
  try {
    return Object.values(ARCHIVOS).every((archivo) => fs.existsSync(ruta(archivo)))
  } catch {
    return false
  }
}

/** Se resuelve una sola vez por proceso: el filesystem no cambia en runtime. */
const HAY_FUENTES_DE_MARCA = hayArchivos()

/** Titulares y montos. Sora sólo se usa en semibold. */
export const FAMILIA_DISPLAY = HAY_FUENTES_DE_MARCA ? 'Sora' : 'Helvetica'

/** Texto corrido, etiquetas y tablas. */
export const FAMILIA_TEXTO = HAY_FUENTES_DE_MARCA ? 'Manrope' : 'Helvetica'

/**
 * Pesos. Con las fuentes de marca se usan los numéricos reales; con
 * Helvetica hay que hablarle en las palabras que entiende el set
 * estándar del PDF (`normal` / `bold`), porque no existe un 500 ni un
 * 600 al que caer.
 */
export const PESO_NORMAL: 'normal' | 400 = HAY_FUENTES_DE_MARCA ? 400 : 'normal'
export const PESO_MEDIO: 'normal' | 500 = HAY_FUENTES_DE_MARCA ? 500 : 'normal'
export const PESO_FUERTE: 'bold' | 600 = HAY_FUENTES_DE_MARCA ? 600 : 'bold'

let registrado = false

/**
 * Idempotente a propósito: el módulo del documento la llama en cada
 * render y en un server de larga vida eso pasa muchas veces. Registrar
 * dos veces la misma familia rompe el store de fuentes de react-pdf.
 */
export function registrarFuentes(): void {
  if (registrado) return
  registrado = true

  // Nombres de prestación como "Endodoncia multirradicular" no se
  // cortan con guión en la mitad: en un documento que el paciente
  // compara contra el presupuesto de otro consultorio, un corte raro
  // se lee como error de la clínica.
  Font.registerHyphenationCallback((palabra) => [palabra])

  if (!HAY_FUENTES_DE_MARCA) return

  Font.register({
    family: 'Sora',
    fonts: [{ src: ruta(ARCHIVOS.soraSemiBold), fontWeight: 600 }],
  })

  Font.register({
    family: 'Manrope',
    fonts: [
      { src: ruta(ARCHIVOS.manropeRegular), fontWeight: 400 },
      { src: ruta(ARCHIVOS.manropeMedium), fontWeight: 500 },
      { src: ruta(ARCHIVOS.manropeSemiBold), fontWeight: 600 },
    ],
  })
}

registrarFuentes()
