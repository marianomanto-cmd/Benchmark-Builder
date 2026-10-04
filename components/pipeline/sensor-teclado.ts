import {
  KeyboardSensor,
  type Activators,
  type KeyboardSensorOptions,
  type SensorInstance,
  type SensorProps,
} from '@dnd-kit/core'

import { CLAVES_COLUMNA, ID_FRANJA_PERDIDO, idColumna, type DatosTarjeta } from './tipos'
import { destapar, leerZonas, type Caja, type Punto } from './zonas'

/**
 * Mover tarjetas con el teclado, de zona en zona.
 *
 * ← → llevan la tarjeta a la columna de al lado, ↓ a la franja de
 * perdidos y ↑ de vuelta a la columna. Espacio, Enter o Tab sueltan;
 * Escape cancela.
 *
 * POR QUÉ NO EL `KeyboardSensor` DE DND-KIT. Ése mueve la tarjeta hacia
 * el droppable más cercano y, cuando la nueva posición pasa la mitad de
 * la pantalla, en vez de moverla SCROLLEA la página (`handleKeyDown`).
 * Con el tablero en un solo scroll vertical y la franja pegada al pie,
 * ↓ correría la página entera en lugar de llegar a la franja, que nunca
 * se acerca. Acá el destino es siempre una zona, se calcula con lo que
 * está a la vista (`leerZonas`), y la página no se toca: todas las
 * zonas están siempre en pantalla.
 *
 * Arranca igual que el de dnd-kit —reusa sus activadores: Espacio o
 * Enter sobre la tarjeta— y lo cancelan las mismas cosas: un resize o
 * cambiar de pestaña.
 */
export class SensorTeclado implements SensorInstance {
  autoScrollEnabled = false

  static activators: Activators<KeyboardSensorOptions> = KeyboardSensor.activators

  private readonly props: SensorProps<KeyboardSensorOptions>
  /** Dónde estaba la tarjeta al empezar: `onMove` pide el corrimiento desde ahí. */
  private referencia: Punto | null = null
  /** Índice en `CLAVES_COLUMNA` de la columna sobre la que está. */
  private columna: number
  private enFranja = false
  /** Altura a la que estaba antes de bajar a la franja, para volver ahí. */
  private yEnColumnas: number | null = null
  private readonly desarmar: Array<() => void> = []

  constructor(props: SensorProps<KeyboardSensorOptions>) {
    this.props = props
    const nodo = props.activeNode.node.current
    const datos = props.activeNode.data.current as DatosTarjeta | undefined
    this.columna = Math.max(0, datos ? CLAVES_COLUMNA.indexOf(datos.columna) : 0)

    // Que la tarjeta no arranque tapada por el encabezado pegado arriba
    // o por la franja de abajo: el fantasma nace donde está ella.
    if (nodo) destapar(nodo)
    props.onStart({ x: 0, y: 0 })

    const documento = nodo?.ownerDocument ?? document
    const ventana = documento.defaultView ?? window
    const alTeclear = (e: KeyboardEvent) => this.alTeclear(e)
    const cancelar = () => this.terminar('cancelar')

    // Un tick de espera: la misma tecla que levantó la tarjeta no tiene
    // que soltarla.
    const espera = setTimeout(() => documento.addEventListener('keydown', alTeclear))
    ventana.addEventListener('resize', cancelar)
    ventana.addEventListener('visibilitychange', cancelar)

    this.desarmar.push(
      () => clearTimeout(espera),
      () => documento.removeEventListener('keydown', alTeclear),
      () => ventana.removeEventListener('resize', cancelar),
      () => ventana.removeEventListener('visibilitychange', cancelar),
    )
  }

  private alTeclear(e: KeyboardEvent) {
    switch (e.code) {
      case 'Space':
      case 'Enter':
      case 'Tab':
        e.preventDefault()
        this.terminar('soltar')
        return
      case 'Escape':
        e.preventDefault()
        this.terminar('cancelar')
        return
      case 'ArrowLeft':
      case 'ArrowRight':
      case 'ArrowUp':
      case 'ArrowDown': {
        // Siempre, aunque la flecha no lleve a ningún lado: si no, la
        // página scrollea con la tarjeta levantada.
        e.preventDefault()
        const destino = this.destino(e.code)
        if (destino && this.referencia) {
          this.props.onMove({ x: destino.x - this.referencia.x, y: destino.y - this.referencia.y })
        }
      }
    }
  }

  /** Esquina superior izquierda donde tiene que quedar la tarjeta, o `null` si no se mueve. */
  private destino(tecla: string): Punto | null {
    const { collisionRect, droppableContainers } = this.props.context.current
    if (!collisionRect) return null
    this.referencia ??= { x: collisionRect.left, y: collisionRect.top }

    const zonas = leerZonas()
    const columnas = CLAVES_COLUMNA.map((clave) => zonas.columnas.get(idColumna(clave)))
    const { width: ancho, height: alto } = collisionRect

    const sobreColumna = (c: Caja, y: number): Punto => ({
      x: c.left + (c.right - c.left - ancho) / 2,
      // Entera adentro de la parte visible, si entra.
      y: Math.min(Math.max(y, c.top), Math.max(c.top, c.bottom - alto)),
    })

    switch (tecla) {
      case 'ArrowLeft':
      case 'ArrowRight': {
        if (this.enFranja) return null
        const siguiente = this.columna + (tecla === 'ArrowRight' ? 1 : -1)
        const c = columnas[siguiente]
        if (!c) return null
        this.columna = siguiente
        return sobreColumna(c, collisionRect.top)
      }

      case 'ArrowDown': {
        const habilitada = droppableContainers.get(ID_FRANJA_PERDIDO)?.disabled === false
        if (this.enFranja || !habilitada || !zonas.franja) return null
        this.enFranja = true
        this.yEnColumnas = collisionRect.top
        const f = zonas.franja
        // El centro de la tarjeta sobre la franja, sin salirse de la pantalla.
        const y = Math.min(f.top + (f.bottom - f.top - alto) / 2, window.innerHeight - alto - 4)
        return { x: collisionRect.left, y: Math.max(y, f.top + 4 - alto / 2) }
      }

      case 'ArrowUp': {
        const c = columnas[this.columna]
        if (!this.enFranja || !c) return null
        this.enFranja = false
        return sobreColumna(c, this.yEnColumnas ?? c.bottom - alto)
      }
    }
    return null
  }

  private terminar(como: 'soltar' | 'cancelar') {
    for (const quitar of this.desarmar.splice(0)) quitar()
    if (como === 'soltar') this.props.onEnd()
    else this.props.onCancel()
  }
}
