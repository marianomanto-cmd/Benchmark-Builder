'use client'

import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  type Over,
  type ScreenReaderInstructions,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import * as React from 'react'
import { toast } from 'sonner'

import { cambiarEstado } from '@/app/actions/seguimiento'
import type { FiltrosHome } from '@/components/home/tipos'
import { ETIQUETA_COLUMNA, ETIQUETA_ESTADO, puedeMarcarsePerdido } from '@/lib/estados'
import type { EstadoPresupuesto, MotivoPerdida } from '@/lib/types'

import { AvisoMobile } from './aviso-mobile'
import { Columna } from './columna'
import { Encabezado } from './encabezado'
import { FiltrosPipeline } from './filtros-pipeline'
import { FranjaPerdido } from './franja-perdido'
import { ModalMotivo } from './modal-motivo'
import { idTarjeta, TarjetaFantasma } from './tarjeta'
import {
  agruparPorColumna,
  CLAVES_COLUMNA,
  columnaDeEstado,
  diasTrasMover,
  esZonaDeDrop,
  estadoDeColumna,
  hayFiltros,
  resumir,
  resumirPerdidos,
  type ClaveColumna,
  type DatosDrop,
  type FilaPipeline,
  type OpcionFiltro,
} from './tipos'
import { useAltoTablero } from './use-alto-tablero'

/**
 * Pantalla 12 · el tablero.
 *
 * Cinco columnas activas y una franja de perdidos al pie. Todo el
 * movimiento es optimista: la tarjeta cambia de columna en el mismo
 * gesto y, si el servidor rechaza el cambio, vuelve sola y aparece el
 * error. Nadie espera un spinner para saber dónde quedó una tarjeta.
 */

/** Cambio pintado antes de que el servidor confirme. */
interface Optimista {
  estado: EstadoPresupuesto
  motivo: MotivoPerdida | null
  /**
   * Estado que tenía la fila en el servidor cuando se pintó el cambio.
   * El override se aplica sólo mientras el servidor siga mostrando ese
   * estado: en cuanto se mueve —porque llegó nuestro cambio, o porque
   * otro lo movió— manda el servidor. Así el optimismo se vence solo,
   * sin un efecto que limpie el estado.
   */
  desde: EstadoPresupuesto
}

const INSTRUCCIONES: ScreenReaderInstructions = {
  draggable:
    'Presioná la barra espaciadora o enter para levantar la tarjeta. ' +
    'Movela entre columnas con las flechas y volvé a presionar la barra espaciadora para soltarla. ' +
    'Con escape cancelás el movimiento y la tarjeta queda donde estaba. ' +
    'La franja de perdidos está debajo de las columnas: soltar ahí abre el selector de motivo.',
}

export function TableroPipeline({
  filas: filasServidor,
  filtros,
  profesionales,
  obrasSociales,
  periodoPerdidos,
}: {
  filas: FilaPipeline[]
  filtros: FiltrosHome
  profesionales: OpcionFiltro[]
  obrasSociales: OpcionFiltro[]
  periodoPerdidos: string
}) {
  const [optimistas, setOptimistas] = React.useState<Record<string, Optimista>>({})
  const [enVuelo, setEnVuelo] = React.useState<Record<string, boolean>>({})
  const [activa, setActiva] = React.useState<FilaPipeline | null>(null)
  const [pendientePerdido, setPendientePerdido] = React.useState<FilaPipeline | null>(null)
  const [guardandoPerdido, setGuardandoPerdido] = React.useState(false)
  const [refZona, altoZona] = useAltoTablero()

  /**
   * Cuando llega el servidor, los overrides ya vencidos se tiran.
   *
   * No es sólo higiene. El override se aplica mientras el servidor siga
   * mostrando el estado del que salió la tarjeta, así que uno que quedó
   * dando vueltas REVIVE si el presupuesto vuelve a ese estado por
   * fuera del tablero —desde el detalle, en otra pestaña, o por el cron
   * de `enviado → pendiente`—: la tarjeta salta sola a una columna que
   * nadie pidió y el tablero miente hasta que se recarga la página.
   *
   * Se ajusta en render y no en un efecto: un `setState` dentro de un
   * efecto dispara un render en cascada, y acá alcanza con corregir el
   * estado en el mismo render en el que cambió la prop.
   */
  const [ultimasFilas, setUltimasFilas] = React.useState(filasServidor)
  if (ultimasFilas !== filasServidor) {
    setUltimasFilas(filasServidor)
    setOptimistas((previos) => {
      const vivos: Record<string, Optimista> = {}
      let sobra = false
      for (const [id, cambio] of Object.entries(previos)) {
        // Lo que todavía está viajando se conserva: su respuesta puede
        // llegar después de esta revalidación.
        if (enVuelo[id] || filasServidor.find((f) => f.id === id)?.estado === cambio.desde) {
          vivos[id] = cambio
        } else {
          sobra = true
        }
      }
      return sobra ? vivos : previos
    })
  }

  const filas = React.useMemo(
    () =>
      filasServidor.map((fila) => {
        const cambio = optimistas[fila.id]
        // El override vale mientras el servidor no se haya movido de
        // donde salió la tarjeta. Cuando llega la revalidación con el
        // estado nuevo, esta comparación falla y manda el servidor.
        if (!cambio || fila.estado !== cambio.desde) return fila
        return {
          ...fila,
          estado: cambio.estado,
          motivo_perdida: cambio.motivo,
          // El reloj de «días en el estado» se pinta como lo va a dejar
          // el trigger, que NO lo reinicia en `enviado → pendiente`.
          dias_en_estado: diasTrasMover(cambio.desde, cambio.estado, fila.dias_en_estado),
        }
      }),
    [filasServidor, optimistas],
  )

  const porId = React.useMemo(() => new Map(filas.map((f) => [f.id, f])), [filas])

  /**
   * El servidor, siempre al día y sin depender del render en el que se
   * creó el callback. Es lo que hay que guardar como `desde`: si se
   * guardara el estado ya overrideado, un segundo arrastre sobre la
   * misma tarjeta antes de que responda el primero nacería vencido.
   */
  const servidorRef = React.useRef(filasServidor)
  const porIdRef = React.useRef(porId)
  React.useEffect(() => {
    servidorRef.current = filasServidor
    porIdRef.current = porId
  }, [filasServidor, porId])

  const estadoServidor = React.useCallback(
    (fila: FilaPipeline): EstadoPresupuesto =>
      servidorRef.current.find((f) => f.id === fila.id)?.estado ?? fila.estado,
    [],
  )

  const columnas = React.useMemo(() => agruparPorColumna(filas), [filas])
  const perdidos = React.useMemo(
    () => resumirPerdidos(filas.filter((f) => f.estado === 'perdido')),
    [filas],
  )
  const total = React.useMemo(
    () => resumir(CLAVES_COLUMNA.flatMap((clave) => columnas[clave])),
    [columnas],
  )

  /* ── Movimiento ──────────────────────────────────────────── */

  const mover = React.useCallback(
    async (
      fila: FilaPipeline,
      estado: EstadoPresupuesto,
      motivo: MotivoPerdida | null = null,
      nota: string | null = null,
    ): Promise<boolean> => {
      setOptimistas((previos) => ({
        ...previos,
        [fila.id]: { estado, motivo, desde: estadoServidor(fila) },
      }))
      setEnVuelo((previos) => ({ ...previos, [fila.id]: true }))

      /** Descarta el cambio pintado: la tarjeta vuelve a su columna. */
      const revertir = () =>
        setOptimistas((previos) => {
          const siguientes = { ...previos }
          delete siguientes[fila.id]
          return siguientes
        })

      try {
        const resultado = await cambiarEstado(fila.id, estado, motivo, nota)

        if (!resultado.ok) {
          revertir()
          toast.error(resultado.error)
          return false
        }

        return true
      } catch {
        // Sin este catch, un corte de red dejaba la tarjeta congelada en
        // la columna equivocada y el modal de perdido trabado en
        // "guardando": la promesa rechazada nunca limpiaba nada.
        revertir()
        toast.error('No se pudo guardar el cambio. Fijate la conexión y probá de nuevo.')
        return false
      } finally {
        setEnVuelo((previos) => {
          const siguientes = { ...previos }
          delete siguientes[fila.id]
          return siguientes
        })
      }
    },
    [estadoServidor],
  )

  /**
   * Confirmación con vuelta atrás.
   *
   * Un arrastre es un gesto barato —un pulso de más y un presupuesto
   * cambió de etapa— y el cambio queda en un historial que no se edita.
   * «Deshacer» no borra nada: escribe el paso inverso, que es la verdad
   * de lo que pasó. Sin esto, la única forma de arreglar un resbalón era
   * abrir el detalle y buscar el estado anterior de memoria.
   */
  const avisarConDeshacer = React.useCallback(
    (fila: FilaPipeline, desde: EstadoPresupuesto, hacia: EstadoPresupuesto) => {
      const texto =
        hacia === 'perdido'
          ? `${fila.paciente_nombre}: presupuesto marcado como perdido.`
          : `${fila.paciente_nombre} pasó a ${ETIQUETA_ESTADO[hacia]}.`

      toast.success(texto, {
        duration: 7000,
        action: {
          label: 'Deshacer',
          onClick: () => void mover(fila, desde),
        },
      })
    },
    [mover],
  )

  /* ── Drag & drop ─────────────────────────────────────────── */

  /**
   * Los sensores son SIEMPRE los mismos, en desktop y en mobile.
   *
   * Antes acá había un `sinSensores = useSensors()` que se pasaba al
   * `DndContext` cuando `useEsDesktop()` daba falso. Sobraba —el
   * tablero vive dentro de un `hidden md:flex`, y de un `display:none`
   * no se arrastra ni se tabula— y encima rompía: `useSensorSetup()`
   * de dnd-kit usa la lista de sensores COMO array de dependencias, así
   * que pasar de cero a dos le cambiaba el tamaño entre renders. El
   * primer render del cliente asume mobile (`useSyncExternalStore`
   * devuelve el snapshot del servidor) y el siguiente corrige a
   * desktop: el swap ocurría en cada carga en una pantalla grande, y
   * React tiraba «the final argument passed to useEffect changed size
   * between renders» antes de dejar el efecto en un estado indefinido.
   */
  const sensores = useSensors(
    // 6px de umbral: sin esto, un clic en el nombre del paciente se
    // interpretaría como el arranque de un arrastre.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  /**
   * Sólo las zonas gruesas —las cinco columnas y la franja— son
   * destino.
   *
   * BUG QUE ARREGLA: las tarjetas también son droppables (el
   * `KeyboardSensor` las necesita como mapa para moverse con las
   * flechas), y `pointerWithin` devolvía primero la tarjeta que estaba
   * debajo del puntero. Como `over` era esa tarjeta y no su columna,
   * `isOver` daba falso en todas las columnas: arrastrar sobre una
   * columna con tarjetas —o sea, casi siempre— no prendía nada y el
   * tablero no decía dónde iba a caer. Filtrando acá, `over` es siempre
   * una zona y el resaltado sale solo.
   *
   * El puntero manda mientras hay mouse; con teclado no hay puntero y
   * se cae a la geometría de las zonas.
   */
  const deteccion = React.useCallback<CollisionDetection>((args) => {
    const zonas = args.droppableContainers.filter((c) => esZonaDeDrop(String(c.id)))
    const argsZonas = { ...args, droppableContainers: zonas }
    const bajoElPuntero = pointerWithin(argsZonas)
    return bajoElPuntero.length > 0 ? bajoElPuntero : closestCorners(argsZonas)
  }, [])

  const anuncios = React.useMemo<Announcements>(() => {
    const nombre = (id: UniqueIdentifier) =>
      porIdRef.current.get(String(id))?.paciente_nombre ?? 'la tarjeta'

    const destino = (over: Over | null) => {
      const datos = over?.data.current as DatosDrop | undefined
      if (!datos) return null
      if (datos.tipo === 'perdido') return 'la franja de perdidos'
      if (datos.tipo === 'columna') return `la columna ${ETIQUETA_COLUMNA[datos.columna]}`
      return null
    }

    return {
      onDragStart: ({ active }) =>
        `Levantaste el presupuesto de ${nombre(active.id)}. Movelo con las flechas.`,
      onDragOver: ({ active, over }) => {
        const donde = destino(over)
        return donde
          ? `El presupuesto de ${nombre(active.id)} está sobre ${donde}.`
          : `El presupuesto de ${nombre(active.id)} no está sobre ninguna zona.`
      },
      onDragEnd: ({ active, over }) => {
        const donde = destino(over)
        return donde
          ? `Soltaste el presupuesto de ${nombre(active.id)} en ${donde}.`
          : `Soltaste el presupuesto de ${nombre(active.id)} fuera del tablero: quedó donde estaba.`
      },
      onDragCancel: ({ active }) =>
        `Cancelaste el movimiento. El presupuesto de ${nombre(active.id)} quedó donde estaba.`,
    }
  }, [])

  function alLevantar(evento: DragStartEvent) {
    setActiva(porId.get(String(evento.active.id)) ?? null)
  }

  /**
   * El foco vuelve a la tarjeta después de moverla con el teclado.
   *
   * Cambiar de columna la saca de una lista y la mete en otra: React
   * desmonta el nodo viejo y monta uno nuevo, así que el foco se cae al
   * `body`. Sin esto, quien navegaba sin mouse tenía que volver a
   * tabular desde el principio de la página después de CADA movimiento,
   * y el recorrido con teclado —que dnd-kit resuelve bien hasta el
   * momento de soltar— quedaba inservible en la práctica.
   *
   * Con mouse no se toca el foco: mover el foco por un gesto de puntero
   * es justo lo que hace saltar la página sin que nadie lo haya pedido.
   */
  function devolverFoco(evento: DragEndEvent, id: string) {
    if (!(evento.activatorEvent instanceof KeyboardEvent)) return
    // Un frame: para entonces React ya montó la tarjeta en su columna.
    requestAnimationFrame(() => document.getElementById(idTarjeta(id))?.focus())
  }

  function alSoltar(evento: DragEndEvent) {
    const { active, over } = evento
    setActiva(null)

    const fila = porId.get(String(active.id))
    const datos = over?.data.current as DatosDrop | undefined
    if (!fila || !datos) return

    if (datos.tipo === 'perdido') {
      if (!puedeMarcarsePerdido(fila.estado)) {
        toast.error('Un tratamiento ya iniciado no se marca como perdido.')
        return
      }
      // La tarjeta deja su columna ya mismo, pero el cambio no viaja
      // hasta que se elija el motivo: eso pasa en `confirmarPerdido`.
      setOptimistas((previos) => ({
        ...previos,
        [fila.id]: { estado: 'perdido', motivo: null, desde: estadoServidor(fila) },
      }))
      setPendientePerdido(fila)
      return
    }

    if (datos.tipo !== 'columna') return

    const columnaDestino: ClaveColumna = datos.columna
    if (columnaDeEstado(fila.estado) === columnaDestino) return

    // Red de seguridad: la tarjeta de un tratamiento iniciado ni
    // siquiera levanta (ver `bloqueada` en `tarjeta.tsx`), pero si
    // alguna vez volviera a levantar, el arrastre no lo degrada.
    if (fila.estado === 'iniciado') {
      toast.error(
        'El tratamiento ya está iniciado. Si hay que corregirlo, cambiá el estado desde el detalle.',
      )
      return
    }

    const desde = estadoServidor(fila)
    const hacia = estadoDeColumna(columnaDestino)
    void mover(fila, hacia).then((ok) => {
      if (ok) avisarConDeshacer(fila, desde, hacia)
    })
    devolverFoco(evento, fila.id)
  }

  /* ── Perdido ─────────────────────────────────────────────── */

  function cancelarPerdido() {
    const fila = pendientePerdido
    if (!fila) return
    setOptimistas((previos) => {
      const siguientes = { ...previos }
      delete siguientes[fila.id]
      return siguientes
    })
    setPendientePerdido(null)
  }

  async function confirmarPerdido(motivo: MotivoPerdida, nota: string) {
    const fila = pendientePerdido
    if (!fila) return

    const desde = estadoServidor(fila)
    setGuardandoPerdido(true)
    const ok = await mover(fila, 'perdido', motivo, nota || null)
    setGuardandoPerdido(false)
    setPendientePerdido(null)

    if (ok) avisarConDeshacer(fila, desde, 'perdido')
  }

  const franjaHabilitada = activa === null || puedeMarcarsePerdido(activa.estado)

  return (
    <div className="flex flex-col gap-5">
      <Encabezado
        filtros={filtros}
        cantidad={total.cantidad}
        monto={total.monto}
        filtrado={hayFiltros(filtros)}
      />

      {/* Mobile: la ruta existe, la experiencia no. */}
      <div className="md:hidden">
        <AvisoMobile filtros={filtros} />
      </div>

      <div className="hidden flex-col gap-4 md:flex">
        <FiltrosPipeline
          filtros={filtros}
          profesionales={profesionales}
          obrasSociales={obrasSociales}
        />

        <DndContext
          /* `id` fijo y no autogenerado: sin él dnd-kit numera el
             `aria-describedby` de cada tarjeta con un contador de
             módulo, que en el servidor sigue creciendo entre requests y
             en el cliente arranca de cero. El HTML no coincidía y React
             re-renderizaba el tablero entero al hidratar. */
          id="pipeline"
          sensors={sensores}
          collisionDetection={deteccion}
          accessibility={{ announcements: anuncios, screenReaderInstructions: INSTRUCCIONES }}
          onDragStart={alLevantar}
          onDragEnd={alSoltar}
          onDragCancel={() => setActiva(null)}
        >
          {/* El tablero entra en el viewport: las columnas scrollean por
              adentro y la franja queda siempre al pie, sin que la página
              crezca con la columna más larga. El alto se mide, no se
              adivina (`useAltoTablero`). */}
          <div
            ref={refZona}
            /* Alto definido y no `max-height`: las columnas resuelven su
               `h-full` contra este número, así las cinco miden lo mismo
               y la franja queda clavada al pie. El `calc` es sólo el
               primer cuadro, hasta que `useAltoTablero` mide de verdad. */
            style={{ height: altoZona ?? 'calc(100dvh - 330px)' }}
            className="flex min-h-[320px] flex-col gap-3"
          >
            {/* Sangra hasta los bordes del `<main>` para que el scroll
                horizontal del tablero no recorte las tarjetas. */}
            <div className="-mx-8 min-h-0 flex-1 overflow-x-auto scroll-visible px-8 pb-1">
              {/*
                `grid-rows-1` es `grid-template-rows: minmax(0, 1fr)`, y
                sin él nada de esto funciona: el `h-full` del grid le
                daba 574px al contenedor, pero la fila implícita se
                dimensiona POR CONTENIDO, así que medía 2138px y el
                `h-full` de cada columna se resolvía contra ESO. Las
                columnas quedaban de 2138px, su `ul` con
                `overflow-y-auto` nunca llegaba a scrollear, y quien
                scrolleaba era el envoltorio entero: girar la rueda se
                llevaba puestos los cinco encabezados con el nombre de
                la etapa, el conteo y el monto.

                Y de yapa: con las columnas de 2138px, sus rects de
                colisión cubrían casi toda la página, así que dnd-kit
                encontraba una columna «debajo del puntero» en cualquier
                lado —soltar sobre la barra de filtros cambiaba el
                estado— y con teclado la franja de perdidos ganaba
                siempre el `closestCorners`.
              */}
              <div className="grid h-full min-w-[980px] grid-cols-5 grid-rows-1 gap-3">
                {CLAVES_COLUMNA.map((clave) => (
                  <Columna
                    key={clave}
                    clave={clave}
                    filas={columnas[clave]}
                    enVuelo={enVuelo}
                    activa={activa}
                  />
                ))}
              </div>
            </div>

            <FranjaPerdido
              resumen={perdidos}
              periodo={periodoPerdidos}
              arrastrando={activa !== null}
              habilitada={franjaHabilitada}
            />
          </div>

          {/* Sin animación de vuelta: la tarjeta ya está en su columna
              nueva, animarla hacia la vieja contaría otra historia. */}
          <DragOverlay dropAnimation={null}>
            {activa ? <TarjetaFantasma fila={activa} /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* La `key` remonta el formulario en cada apertura: es la forma
          idiomática de resetear estado en React, sin un efecto que
          dispare renders en cascada. */}
      <ModalMotivo
        key={pendientePerdido?.id ?? 'sin-fila'}
        fila={pendientePerdido}
        guardando={guardandoPerdido}
        onConfirmar={(motivo, nota) => void confirmarPerdido(motivo, nota)}
        onCancelar={cancelarPerdido}
      />
    </div>
  )
}
