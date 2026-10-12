/**
 * La planilla mensual de aranceles, leída.
 *
 * Una vez por mes el consultorio actualiza los precios particulares con
 * un Excel de tres columnas:
 *
 *   Tipo        Subtipo                      Efectivo
 *   ENDODONCIA  Endodoncia premolar          $285,000.00
 *   Consulta    Consulta odontológica        45000
 *
 * Tipo es el rubro, Subtipo es la prestación y Efectivo el precio
 * particular. Este módulo convierte lo que devuelve `read-excel-file`
 * (una matriz de celdas) en filas limpias para `importar_aranceles()`,
 * que es la que decide qué pasa con cada una contra la base. Acá no se
 * reconoce ninguna prestación: eso vive en SQL, en un solo lugar, para
 * que la vista previa y la escritura no puedan dar distinto.
 *
 * Lo que sí se resuelve acá es lo que trae una planilla real:
 *
 * - **Precios escritos de cualquier manera.** La misma columna mezcla
 *   números (`300000`) con texto en formato de EE.UU. (`$45,000.00`) o
 *   argentino (`$ 45.000`). `parsearMonto()` decide el separador
 *   decimal por la forma del número, no por un locale.
 * - **Ceros perdidos.** `$800.00` es un precio válido para la planilla
 *   y casi seguro un error para una corona de zirconio. No se corrige
 *   solo —no hay forma de saber cuántos ceros faltan—: `sospechas()` lo
 *   marca y la pantalla lo deja afuera hasta que alguien lo confirme.
 * - **Tipo en una celda combinada** o escrito una sola vez arriba del
 *   grupo: las filas sin Tipo heredan el de la fila anterior.
 * - **El mismo rubro en dos grafías** (`Consulta` y `CONSULTA`): se
 *   unifican en la primera que aparece, y si está todo en mayúsculas se
 *   pasa a oración. La base después lo lleva a la grafía que ya tenga la
 *   biblioteca.
 */

import { money, normalizar } from './formato.ts'

/* ═══════════════════════════════════════════════════════════
   Tipos
   ═══════════════════════════════════════════════════════════ */

/** Una fila de la planilla, lista para mandar a la base. */
export interface FilaPlanilla {
  /** Número de fila en el Excel (la del encabezado es la 1 típicamente). */
  fila: number
  rubro: string | null
  nombre: string
  /** Pesos enteros. `null` = la celda estaba vacía o no se pudo leer. */
  monto: number | null
  /** Lo que decía la celda del precio, tal cual, para mostrarlo. */
  textoPrecio: string
  /** Por qué no se puede cargar, dicho para el consultorio. */
  problema: string | null
  /** Algo que se hizo con el dato y conviene saber (un redondeo). */
  nota: string | null
}

export interface Planilla {
  filas: FilaPlanilla[]
  /** Fila del Excel donde están los encabezados. */
  filaEncabezado: number
  /** Los encabezados tal como estaban escritos. */
  columnas: { tipo: string | null; subtipo: string; precio: string }
  /** Encabezados que no se usan (otra lista de precios, notas…). */
  ignoradas: string[]
}

export type LecturaPlanilla = { ok: true; planilla: Planilla } | { ok: false; error: string }

/* ═══════════════════════════════════════════════════════════
   Claves
   ═══════════════════════════════════════════════════════════ */

/**
 * Identidad de un nombre del catálogo: sin acentos, en minúsculas y con
 * los signos y espacios colapsados. Es el par en TS de
 * `clave_catalogo()` en SQL; acá sólo se usa para unificar rubros dentro
 * de la misma planilla. El reconocimiento de prestaciones contra la
 * biblioteca lo hace la base.
 */
export function claveCatalogo(texto: string): string {
  return normalizar(texto).replace(/[^a-z0-9]+/g, ' ').trim()
}

/** Texto de una celda, con los espacios colapsados. */
function textoCelda(valor: unknown): string {
  if (valor === null || valor === undefined) return ''
  if (valor instanceof Date) return valor.toISOString().slice(0, 10)
  return String(valor).replace(/\s+/g, ' ').trim()
}

/**
 * «PROTESIS Y REHABILITACION» → «Protesis y rehabilitacion».
 *
 * Una planilla en mayúsculas crearía rubros que gritan en toda la app.
 * Lo que ya viene en minúsculas se respeta tal cual: alguien lo
 * escribió así a propósito. Los acentos no se pueden adivinar.
 */
export function prolijarRubro(texto: string): string {
  const limpio = textoCelda(texto)
  const tieneMinusculas = limpio !== limpio.toUpperCase()
  if (tieneMinusculas || !/\p{L}/u.test(limpio)) return limpio
  const bajo = limpio.toLocaleLowerCase('es')
  return bajo.charAt(0).toLocaleUpperCase('es') + bajo.slice(1)
}

/* ═══════════════════════════════════════════════════════════
   Precios
   ═══════════════════════════════════════════════════════════ */

export interface LecturaMonto {
  monto: number | null
  problema: string | null
  nota: string | null
}

/** Lo único con letras que puede acompañar a un precio. */
const MONEDA = /ar\$|ars|pesos|\$/g

/**
 * Un precio de la planilla, en pesos enteros.
 *
 * El separador decimal se decide por la forma del número:
 *
 * - Con punto y coma, el último es el decimal: `45,000.00` y
 *   `45.000,00` son lo mismo.
 * - Con un solo tipo de separador repetido, son miles: `1.250.000`.
 * - Con uno solo seguido de exactamente tres dígitos, son miles:
 *   `45,000` y `45.000` son cuarenta y cinco mil en las dos
 *   convenciones. Ningún precio se escribe con tres decimales.
 * - Con uno solo seguido de uno o dos dígitos, es decimal: `800.00` son
 *   ochocientos pesos. Que ochocientos pesos sea poco para la prestación
 *   lo dice `sospechas()`, no este parser: acá no se adivinan ceros.
 */
export function parsearMonto(valor: unknown): LecturaMonto {
  if (valor === null || valor === undefined || valor === '') {
    return { monto: null, problema: 'Falta el precio', nota: null }
  }

  if (typeof valor === 'number') return aPesos(valor)

  if (typeof valor !== 'string') {
    return { monto: null, problema: 'La celda del precio no tiene un número', nota: null }
  }

  const original = valor.trim()
  if (original === '') return { monto: null, problema: 'Falta el precio', nota: null }

  const minusculas = original.toLowerCase().replace(/[\s ]/g, '')
  if (/[a-z]/.test(minusculas.replace(MONEDA, ''))) {
    return { monto: null, problema: `No es un precio: «${original}»`, nota: null }
  }

  // «$ 45.000.-» y «45.000,-» son la forma argentina de decir «sin
  // centavos», no un signo: se sacan antes de buscar el negativo.
  const sinGuion = minusculas.replace(/[.,]?-$/, '')
  const negativo = sinGuion.replace(MONEDA, '').startsWith('-') || /^\(.*\)$/.test(sinGuion)
  const cifras = sinGuion.replace(/[^\d.,]/g, '')

  if (!/\d/.test(cifras)) {
    return { monto: null, problema: `No es un precio: «${original}»`, nota: null }
  }
  if (negativo) {
    return { monto: null, problema: 'El precio no puede ser negativo', nota: null }
  }

  const numero = interpretarCifras(cifras)
  if (numero === null) {
    return { monto: null, problema: `No se entiende el número: «${original}»`, nota: null }
  }
  return aPesos(numero)
}

function interpretarCifras(cifras: string): number | null {
  const ultimoPunto = cifras.lastIndexOf('.')
  const ultimaComa = cifras.lastIndexOf(',')

  let entero: string
  let decimales = ''

  if (ultimoPunto !== -1 && ultimaComa !== -1) {
    const decimal = ultimoPunto > ultimaComa ? '.' : ','
    const miles = decimal === '.' ? ',' : '.'
    const corte = cifras.lastIndexOf(decimal)
    entero = cifras.slice(0, corte)
    decimales = cifras.slice(corte + 1)
    // El de miles no puede aparecer después del decimal, ni el decimal
    // dos veces: «1.234,5.6» no es un número.
    if (decimales.includes(miles) || entero.includes(decimal)) return null
    entero = entero.split(miles).join('')
  } else if (ultimoPunto !== -1 || ultimaComa !== -1) {
    const separador = ultimoPunto !== -1 ? '.' : ','
    const partes = cifras.split(separador)
    if (partes.length > 2) {
      // Repetido: separador de miles.
      entero = partes.join('')
    } else {
      const [izquierda, derecha] = partes
      if (derecha.length === 3 && izquierda.length > 0) {
        entero = izquierda + derecha
      } else {
        entero = izquierda
        decimales = derecha
      }
    }
  } else {
    entero = cifras
  }

  if (!/^\d*$/.test(entero) || !/^\d*$/.test(decimales)) return null
  if (entero === '' && decimales === '') return null

  const numero = Number(`${entero || '0'}.${decimales || '0'}`)
  return Number.isFinite(numero) ? numero : null
}

function aPesos(numero: number): LecturaMonto {
  if (!Number.isFinite(numero)) {
    return { monto: null, problema: 'La celda del precio no tiene un número', nota: null }
  }
  if (numero < 0) {
    return { monto: null, problema: 'El precio no puede ser negativo', nota: null }
  }
  // Primero a centavos, para que el ruido de coma flotante de una
  // fórmula (1007499.9999999) no se lea como «tenía centavos».
  const centavos = Math.round(numero * 100) / 100
  const pesos = Math.round(centavos)
  if (pesos > 999_999_999) {
    return { monto: null, problema: 'El precio es demasiado grande: revisá la celda', nota: null }
  }
  return {
    monto: pesos,
    problema: null,
    nota: centavos !== pesos ? `Tenía centavos: se redondeó a ${money(pesos)}` : null,
  }
}

/* ═══════════════════════════════════════════════════════════
   Encabezados
   ═══════════════════════════════════════════════════════════ */

/**
 * Cómo se puede llamar cada columna. En orden de preferencia: si la
 * planilla trae «Efectivo» y «Precio», manda «Efectivo», que es el
 * particular.
 */
const ENCABEZADOS = {
  tipo: ['tipo', 'rubro', 'categoria', 'especialidad', 'area'],
  subtipo: [
    'subtipo',
    'sub tipo',
    'prestacion',
    'prestaciones',
    'tratamiento',
    'practica',
    'detalle',
    'descripcion',
    'nombre',
  ],
  precio: [
    'efectivo',
    'precio efectivo',
    'particular',
    'precio particular',
    'contado',
    'precio',
    'monto',
    'valor',
    'importe',
    'arancel',
  ],
} as const

/** Filas en las que se busca el encabezado antes de rendirse. */
const FILAS_ENCABEZADO = 15

function buscarColumna(claves: string[], opciones: readonly string[]): number {
  for (const opcion of opciones) {
    const i = claves.indexOf(opcion)
    if (i !== -1) return i
  }
  return -1
}

/* ═══════════════════════════════════════════════════════════
   La planilla entera
   ═══════════════════════════════════════════════════════════ */

/** Tope de filas: arriba de esto no es una lista de precios. */
export const MAX_FILAS = 2000

/**
 * Convierte la matriz de celdas en filas para importar.
 *
 * Las filas vacías se saltean. Una fila con Tipo y sin Subtipo ni
 * precio es el título de un grupo: no se importa, pero su Tipo pasa a
 * las filas de abajo.
 */
export function leerPlanilla(celdas: unknown[][]): LecturaPlanilla {
  let filaEncabezado = -1
  let col = { tipo: -1, subtipo: -1, precio: -1 }

  for (let i = 0; i < Math.min(celdas.length, FILAS_ENCABEZADO); i++) {
    const claves = (celdas[i] ?? []).map((c) => claveCatalogo(textoCelda(c)))
    const subtipo = buscarColumna(claves, ENCABEZADOS.subtipo)
    const precio = buscarColumna(claves, ENCABEZADOS.precio)
    if (subtipo !== -1 && precio !== -1 && subtipo !== precio) {
      filaEncabezado = i
      col = { tipo: buscarColumna(claves, ENCABEZADOS.tipo), subtipo, precio }
      break
    }
  }

  if (filaEncabezado === -1) {
    return {
      ok: false,
      error:
        'No encontré los encabezados. La primera fila tiene que decir Tipo, Subtipo y Efectivo (también sirven Rubro, Prestación y Precio).',
    }
  }

  const encabezado = (celdas[filaEncabezado] ?? []).map(textoCelda)
  const usadas = new Set([col.tipo, col.subtipo, col.precio])
  const ignoradas = encabezado.filter((t, i) => t !== '' && !usadas.has(i))

  /** Primera grafía de cada rubro en la planilla. */
  const grafias = new Map<string, string>()
  function rubroUnificado(texto: string): string {
    const prolijo = prolijarRubro(texto)
    const clave = claveCatalogo(prolijo)
    const previa = grafias.get(clave)
    if (previa) return previa
    grafias.set(clave, prolijo)
    return prolijo
  }

  const filas: FilaPlanilla[] = []
  let rubroActual: string | null = null

  for (let i = filaEncabezado + 1; i < celdas.length; i++) {
    const celda = celdas[i] ?? []
    const tipo = col.tipo === -1 ? '' : textoCelda(celda[col.tipo])
    const nombre = textoCelda(celda[col.subtipo])
    const crudoPrecio = celda[col.precio]
    const textoPrecio = textoCelda(crudoPrecio)

    if (tipo === '' && nombre === '' && textoPrecio === '') continue

    if (tipo !== '') rubroActual = rubroUnificado(tipo)

    // Título de un grupo: «ENDODONCIA» solo en su fila.
    if (nombre === '' && textoPrecio === '') continue

    const lectura = parsearMonto(crudoPrecio ?? null)

    filas.push({
      fila: i + 1,
      rubro: rubroActual,
      nombre,
      monto: lectura.monto,
      textoPrecio,
      problema: nombre === '' ? 'Falta el subtipo' : lectura.problema,
      nota: lectura.nota,
    })
  }

  if (filas.length === 0) {
    return { ok: false, error: 'La planilla tiene encabezados pero ninguna fila con precios.' }
  }
  if (filas.length > MAX_FILAS) {
    return {
      ok: false,
      error: `La planilla trae ${filas.length} filas: más de ${MAX_FILAS} no es una lista de precios. Partila en dos archivos.`,
    }
  }

  return {
    ok: true,
    planilla: {
      filas,
      filaEncabezado: filaEncabezado + 1,
      columnas: {
        tipo: col.tipo === -1 ? null : encabezado[col.tipo],
        subtipo: encabezado[col.subtipo],
        precio: encabezado[col.precio],
      },
      ignoradas,
    },
  }
}

/* ═══════════════════════════════════════════════════════════
   Lo que devuelve la base
   ═══════════════════════════════════════════════════════════ */

export type EstadoImportacion =
  | 'crear'
  | 'actualizar'
  | 'corregir'
  | 'igual'
  | 'repetida'
  | 'omitida'
  | 'error'

/** Una fila del plan de `importar_aranceles()`. */
export interface FilaPlan {
  fila: number
  nombre: string
  rubro: string | null
  monto: number | null
  estado: EstadoImportacion
  /** Lo que habría pasado si no se hubiera omitido. */
  previsto: EstadoImportacion
  mensaje: string | null
  avisos: string[]
  prestacion_id: string | null
  /** Cómo se llama en la biblioteca, si ya existía. */
  prestacion: string | null
  rubro_biblioteca: string | null
  activa: boolean | null
  /** El precio que rige el día elegido, antes de importar. */
  monto_actual: number | null
  desde_actual: string | null
  /** Presupuestos emitidos que citan el precio que se reemplaza. */
  usos: number
  /** El día del último presupuesto que impide cerrar el precio actual. */
  emitido_el: string | null
}

export interface PlanImportacion {
  desde: string
  aplicado: boolean
  filas: FilaPlan[]
}

const ESTADOS: readonly EstadoImportacion[] = [
  'crear',
  'actualizar',
  'corregir',
  'igual',
  'repetida',
  'omitida',
  'error',
]

function estadoValido(v: unknown): EstadoImportacion {
  return ESTADOS.includes(v as EstadoImportacion) ? (v as EstadoImportacion) : 'error'
}

function numeroONull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function textoONull(v: unknown): string | null {
  return typeof v === 'string' && v !== '' ? v : null
}

/**
 * El jsonb de la RPC, con los tipos que el cliente espera: `numeric`
 * llega como número o como texto según el camino, y las fechas pueden
 * traer hora.
 */
export function normalizarPlan(crudo: unknown): PlanImportacion | null {
  if (!crudo || typeof crudo !== 'object') return null
  const objeto = crudo as Record<string, unknown>
  if (!Array.isArray(objeto.filas)) return null

  const filas: FilaPlan[] = objeto.filas.map((f: Record<string, unknown>) => ({
    fila: Number(f.fila),
    nombre: String(f.nombre ?? ''),
    rubro: textoONull(f.rubro),
    monto: numeroONull(f.monto),
    estado: estadoValido(f.estado),
    previsto: estadoValido(f.previsto ?? f.estado),
    mensaje: textoONull(f.mensaje),
    avisos: Array.isArray(f.avisos) ? f.avisos.map(String) : [],
    prestacion_id: textoONull(f.prestacion_id),
    prestacion: textoONull(f.prestacion),
    rubro_biblioteca: textoONull(f.rubro_biblioteca),
    activa: typeof f.activa === 'boolean' ? f.activa : null,
    monto_actual: numeroONull(f.monto_actual),
    desde_actual: textoONull(f.desde_actual)?.slice(0, 10) ?? null,
    usos: numeroONull(f.usos) ?? 0,
    emitido_el: textoONull(f.emitido_el)?.slice(0, 10) ?? null,
  }))

  return {
    desde: String(objeto.desde ?? '').slice(0, 10),
    aplicado: objeto.aplicado === true,
    filas,
  }
}

/** Cuántas filas hay en cada estado. */
export function contarPorEstado(filas: FilaPlan[]): Record<EstadoImportacion, number> {
  const conteo = Object.fromEntries(ESTADOS.map((e) => [e, 0])) as Record<
    EstadoImportacion,
    number
  >
  for (const f of filas) conteo[f.estado] += 1
  return conteo
}

/** ¿La fila escribe algo en la base si se aplica? */
export function escribe(estado: EstadoImportacion): boolean {
  return estado === 'crear' || estado === 'actualizar' || estado === 'corregir'
}

/* ═══════════════════════════════════════════════════════════
   Precios que se ven mal
   ═══════════════════════════════════════════════════════════ */

/** Debajo de esto, un precio de una prestación es casi seguro un error. */
export const PISO_SOSPECHOSO = 1_000

/**
 * Variación del precio nuevo respecto del actual, en porcentaje.
 * `null` si no hay precio actual contra qué comparar.
 */
export function variacion(monto: number | null, actual: number | null): number | null {
  if (monto === null || actual === null || actual <= 0) return null
  return ((monto - actual) / actual) * 100
}

/**
 * Por qué un precio merece que alguien lo mire antes de cargarlo.
 *
 * No son errores: un precio puede bajar a la mitad a propósito. Pero
 * son exactamente los síntomas de una celda que perdió los ceros
 * (`$800.00` en vez de `$800.000`) o de un precio pegado en la fila de
 * al lado. La pantalla los deja afuera hasta que alguien los tilde.
 */
export function sospechas(monto: number | null, actual: number | null): string[] {
  if (monto === null) return []
  const salida: string[] = []

  if (monto < PISO_SOSPECHOSO) {
    salida.push(`${money(monto)} es muy poco para una prestación: ¿se perdieron ceros al copiar?`)
  }

  const v = variacion(monto, actual)
  if (v !== null && actual !== null) {
    if (monto < actual / 2) {
      salida.push(`Baja a menos de la mitad: hoy está en ${money(actual)}`)
    } else if (monto > actual * 2) {
      salida.push(`Más que duplica el precio de hoy (${money(actual)})`)
    }
  }

  return salida
}
