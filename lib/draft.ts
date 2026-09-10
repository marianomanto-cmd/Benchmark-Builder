'use client'

/**
 * Borrador del wizard en localStorage.
 *
 * El alta de un presupuesto son tres pasos y en el consultorio se
 * interrumpe todo el tiempo: entra un paciente, suena el teléfono, se
 * recarga la pestaña. El borrador vive en el navegador (no en la base)
 * porque hasta que no se guarda no hay documento: la regla del producto
 * es que un presupuesto emitido es un documento congelado, y un
 * borrador a medias no tiene por qué existir en Postgres.
 *
 * Todo acceso va envuelto en try/catch: en modo privado, con la cuota
 * llena o con el storage bloqueado por política del navegador,
 * `localStorage` tira. Que falle el autoguardado nunca puede romper la
 * carga del presupuesto.
 */

import * as React from 'react'

import type { BorradorPresupuesto } from '@/lib/types'

/** Clave única del borrador. La home la lee para ofrecer "continuar". */
export const CLAVE_BORRADOR = 'smilelab:borrador'

/**
 * ~800 ms: alcanza para no escribir en cada tecla y es lo bastante
 * corto como para que "Guardado 14:32" se sienta inmediato.
 */
export const DEBOUNCE_MS = 800

/**
 * El localStorage es tierra de nadie: puede tener un borrador de una
 * versión vieja del wizard o directamente basura de otra app. Se valida
 * la forma antes de devolverlo.
 */
const TIPOS_COBERTURA = ['porcentaje', 'monto', 'ninguna']

/**
 * Un ítem a medio guardar es peor que ningún borrador: el paso 2 lo
 * renderiza y el footer suma su monto. Si no tiene la forma completa,
 * se descarta el borrador entero.
 */
function esItem(dato: unknown): boolean {
  if (!dato || typeof dato !== 'object') return false
  const i = dato as Record<string, unknown>
  return (
    typeof i.key === 'string' &&
    typeof i.nombre === 'string' &&
    typeof i.monto === 'number' &&
    Number.isFinite(i.monto) &&
    typeof i.cobertura_valor === 'number' &&
    Number.isFinite(i.cobertura_valor) &&
    typeof i.cobertura_tipo === 'string' &&
    TIPOS_COBERTURA.includes(i.cobertura_tipo)
  )
}

function esCuota(dato: unknown): boolean {
  if (!dato || typeof dato !== 'object') return false
  const c = dato as Record<string, unknown>
  return (
    typeof c.key === 'string' &&
    typeof c.etiqueta === 'string' &&
    typeof c.porcentaje === 'number' &&
    Number.isFinite(c.porcentaje)
  )
}

function esBorrador(dato: unknown): dato is BorradorPresupuesto {
  if (!dato || typeof dato !== 'object') return false
  const b = dato as Partial<BorradorPresupuesto>
  if (b.paso !== 1 && b.paso !== 2 && b.paso !== 3) return false
  if (typeof b.guardado_en !== 'string') return false
  if (typeof b.fecha_emision !== 'string' || typeof b.valido_hasta !== 'string') return false
  if (typeof b.observaciones !== 'string' || typeof b.nota_interna !== 'string') return false
  if (b.estado_inicial !== 'realizado' && b.estado_inicial !== 'enviado') return false
  if (typeof b.vigencia_dias !== 'number' || !Number.isFinite(b.vigencia_dias)) return false
  if (!Array.isArray(b.items) || !b.items.every(esItem)) return false
  if (!Array.isArray(b.cuotas) || !b.cuotas.every(esCuota)) return false
  return true
}

/** El borrador guardado, o `null` si no hay o está corrupto. */
/**
 * El evento `storage` del navegador sólo llega a las OTRAS pestañas.
 * Este evento propio cubre la misma pestaña, que es el caso normal:
 * el wizard autoguarda y el banner de la home tiene que enterarse.
 */
const EVENTO_CAMBIO = 'smilelab:borrador-cambio'

function avisarCambio(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(EVENTO_CAMBIO))
}

export function leerBorrador(): BorradorPresupuesto | null {
  if (typeof window === 'undefined') return null
  try {
    const crudo = window.localStorage.getItem(CLAVE_BORRADOR)
    if (!crudo) return null
    const dato: unknown = JSON.parse(crudo)
    return esBorrador(dato) ? normalizar(dato) : null
  } catch {
    // Storage bloqueado o JSON roto: para el wizard es "no hay borrador".
    return null
  }
}

/**
 * Completa los campos que un borrador de una versión anterior del
 * wizard no tenía. Tirar el borrador entero por un campo que se agregó
 * después sería peor que el problema que resuelve validarlo.
 */
function normalizar(b: BorradorPresupuesto): BorradorPresupuesto {
  return { ...b, cuotas_heredadas: b.cuotas_heredadas ?? false }
}

/**
 * Guarda y sella la hora. El sello lo pone esta función y no quien
 * llama, así `guardado_en` siempre es el momento real de la escritura.
 * Devuelve el sello ISO, o `null` si el storage no dejó escribir.
 */
export function guardarBorrador(borrador: BorradorPresupuesto): string | null {
  if (typeof window === 'undefined') return null
  const sello = new Date().toISOString()
  try {
    const conSello: BorradorPresupuesto = { ...borrador, guardado_en: sello }
    window.localStorage.setItem(CLAVE_BORRADOR, JSON.stringify(conSello))
    avisarCambio()
    return sello
  } catch {
    // Cuota llena o modo privado: seguimos sin autoguardado.
    return null
  }
}

/**
 * Cuántas veces se descartó el borrador en esta pestaña.
 *
 * El autoguardado tiene un debounce: cuando se emite el presupuesto (o
 * se descarta el borrador desde la home) puede quedar una escritura en
 * vuelo con el borrador ya obsoleto. Sin este contador, esa escritura
 * resucita en localStorage un borrador que ya es un documento emitido, y
 * la home ofrece "continuar" un presupuesto que ya existe.
 */
let epocaBorrado = 0

export function borrarBorrador(): void {
  epocaBorrado++
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(CLAVE_BORRADOR)
    avisarCambio()
  } catch {
    // Si no se puede borrar, el banner de la home igual lo descarta en pantalla.
  }
}

/**
 * Un wizard recién abierto no tiene que dejar rastro: si se guardara
 * vacío, la home mostraría "quedó un presupuesto a medio cargar" por
 * un modal que alguien abrió y cerró sin tocar nada.
 */
export function tieneAlgoQueGuardar(borrador: BorradorPresupuesto): boolean {
  return (
    Boolean(borrador.paciente_id) ||
    borrador.items.length > 0 ||
    borrador.observaciones.trim() !== '' ||
    borrador.nota_interna.trim() !== ''
  )
}

/**
 * Autoguardado con debounce. Devuelve la hora del último guardado en
 * ISO (`null` mientras no se guardó nada todavía); la pantalla la
 * formatea con `hora()` de `lib/formato` → "Guardado 14:32".
 *
 * Pasar `null` desactiva el autoguardado: es lo que hace el wizard
 * cerrado, para no pisar el borrador con el estado inicial.
 *
 * Dos detalles que se pagan caro en el mostrador:
 *
 *   · **Cerrar dentro del debounce.** Entre paciente y paciente el
 *     wizard se cierra apenas se termina de tipear. Con sólo el
 *     `clearTimeout` del cleanup, ese último campo —el teléfono, el
 *     motivo del override— no llegaba nunca a localStorage. Al pasar de
 *     un borrador a `null` se escribe lo pendiente antes de apagarse.
 *   · **Emitir dentro del debounce.** Esa misma escritura pendiente no
 *     puede resucitar un borrador ya emitido, así que se descarta si
 *     alguien llamó a `borrarBorrador()` mientras tanto.
 */
export function useAutoguardado(borrador: BorradorPresupuesto | null): string | null {
  /** Lo tipeado que todavía no llegó a localStorage. */
  const pendiente = React.useRef<{ borrador: BorradorPresupuesto; epoca: number } | null>(null)

  /**
   * El sello NO se guarda en estado propio: se lee del storage, que es
   * donde realmente vive.
   *
   * Antes había un `useState` que el efecto ponía en `null` al cerrar el
   * wizard, y eso son dos problemas en uno. Uno, es un `setState` dentro
   * de un efecto (render en cascada, y `react-hooks/set-state-in-effect`
   * lo marca). Dos, quedaba desincronizado: si alguien descartaba el
   * borrador desde el banner de la home con el wizard abierto, el
   * storage quedaba vacío pero la barra de pasos seguía diciendo
   * "Guardado 14:32". Derivándolo del store esas dos cosas dejan de
   * poder pasar.
   */
  const guardado = useBorradorGuardado()

  React.useEffect(() => {
    if (!borrador) {
      const enVuelo = pendiente.current
      pendiente.current = null
      // Se cerró el wizard: lo último tipeado se escribe ya, salvo que
      // el borrador se haya emitido o descartado en el medio.
      if (enVuelo && enVuelo.epoca === epocaBorrado) guardarBorrador(enVuelo.borrador)
      return
    }

    if (!tieneAlgoQueGuardar(borrador)) return

    const epoca = epocaBorrado
    pendiente.current = { borrador, epoca }

    const id = window.setTimeout(() => {
      pendiente.current = null
      if (epoca !== epocaBorrado) return
      // El sello llega solo: `guardarBorrador` avisa del cambio y el
      // store lo propaga.
      guardarBorrador(borrador)
    }, DEBOUNCE_MS)

    return () => window.clearTimeout(id)
  }, [borrador])

  // Sin wizard abierto no hay sello que mostrar, aunque el storage
  // tenga un borrador: sería "Guardado" sin nada en pantalla.
  return borrador ? (guardado?.guardado_en ?? null) : null
}

/**
 * Lee el borrador guardado y se actualiza solo cuando cambia — incluido
 * el caso de otra pestaña.
 *
 * Usa `useSyncExternalStore` en lugar de un `useEffect` que hace
 * `setState`: `localStorage` ES un store externo, y ese es justo el
 * caso de uso del hook. De paso evita el render en cascada que provoca
 * setear estado dentro de un efecto.
 *
 * El snapshot es el string crudo (un primitivo, estable entre lecturas);
 * el parseo se memoiza aparte. Devolver el objeto ya parseado haría que
 * `useSyncExternalStore` viera una referencia nueva en cada chequeo y
 * entrara en un bucle de renders.
 */
export function useBorradorGuardado(): BorradorPresupuesto | null {
  const crudo = React.useSyncExternalStore(
    suscribirBorrador,
    leerCrudo,
    // En el servidor no hay storage: el banner aparece después de hidratar.
    () => null,
  )

  return React.useMemo(() => {
    if (!crudo) return null
    try {
      const dato: unknown = JSON.parse(crudo)
      return esBorrador(dato) ? normalizar(dato) : null
    } catch {
      return null
    }
  }, [crudo])
}

function suscribirBorrador(alCambiar: () => void): () => void {
  window.addEventListener(EVENTO_CAMBIO, alCambiar)
  window.addEventListener('storage', alCambiar)
  return () => {
    window.removeEventListener(EVENTO_CAMBIO, alCambiar)
    window.removeEventListener('storage', alCambiar)
  }
}

function leerCrudo(): string | null {
  try {
    return window.localStorage.getItem(CLAVE_BORRADOR)
  } catch {
    return null
  }
}
