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
import { useEsDesktop } from '@/components/ui'
import { ETIQUETA_COLUMNA, puedeMarcarsePerdido } from '@/lib/estados'
import type { EstadoPresupuesto, MotivoPerdida } from '@/lib/types'

import { AvisoMobile } from './aviso-mobile'
import { Columna } from './columna'
import { Encabezado } from './encabezado'
import { FiltrosPipeline } from './filtros-pipeline'
import { FranjaPerdido } from './franja-perdido'
import { ModalMotivo } from './modal-motivo'
import { TarjetaFantasma } from './tarjeta'
import {
  agruparPorColumna,
  CLAVES_COLUMNA,
  columnaDeEstado,
  estadoDeColumna,
  resumir,
  resumirPerdidos,
  type ClaveColumna,
  type DatosDrop,
  type FilaPipeline,
  type OpcionFiltro,
} from './tipos'

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
  const esDesktop = useEsDesktop()

  const [optimistas, setOptimistas] = React.useState<Record<string, Optimista>>({})
  const [enVuelo, setEnVuelo] = React.useState<Record<string, boolean>>({})
  const [activa, setActiva] = React.useState<FilaPipeline | null>(null)
  const [pendientePerdido, setPendientePerdido] = React.useState<FilaPipeline | null>(null)
  const [guardandoPerdido, setGuardandoPerdido] = React.useState(false)

  const filas = React.useMemo(
    () =>
      filasServidor.map((fila) => {
        const cambio = optimistas[fila.id]
        // El override vale mientras el servidor no se haya movido de
        // donde salió la tarjeta. Cuando llega la revalidación con el
        // estado nuevo, esta comparación falla y manda el servidor.
        if (!cambio || fila.estado !== cambio.desde) return fila
        // Un cambio de estado reinicia el reloj de «días en el estado»,
        // igual que hace el trigger `touch_estado_desde` en la base.
        return {
          ...fila,
          estado: cambio.estado,
          motivo_perdida: cambio.motivo,
          dias_en_estado: 0,
        }
      }),
    [filasServidor, optimistas],
  )

  const porId = React.useMemo(() => new Map(filas.map((f) => [f.id, f])), [filas])

  /**
   * Estado real de una fila según el servidor, ignorando cualquier
   * override pintado. Es lo que hay que guardar como `desde`: si se
   * guardara el estado ya overrideado, un segundo arrastre sobre la
   * misma tarjeta antes de que responda el primero nacería vencido.
   */
  const estadoServidor = React.useCallback(
    (fila: FilaPipeline): EstadoPresupuesto =>
      filasServidor.find((f) => f.id === fila.id)?.estado ?? fila.estado,
    [filasServidor],
  )
  const porIdRef = React.useRef(porId)
  React.useEffect(() => {
    porIdRef.current = porId
  }, [porId])

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

      const resultado = await cambiarEstado(fila.id, estado, motivo, nota)

      setEnVuelo((previos) => {
        const siguientes = { ...previos }
        delete siguientes[fila.id]
        return siguientes
      })

      if (!resultado.ok) {
        // Rollback: se descarta el cambio pintado y la tarjeta vuelve a
        // la columna en la que la dejó el servidor.
        setOptimistas((previos) => {
          const siguientes = { ...previos }
          delete siguientes[fila.id]
          return siguientes
        })
        toast.error(resultado.error)
        return false
      }

      return true
    },
    [estadoServidor],
  )

  /* ── Drag & drop ─────────────────────────────────────────── */

  const sensores = useSensors(
    // 6px de umbral: sin esto, un clic en el nombre del paciente se
    // interpretaría como el arranque de un arrastre.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  /** En mobile el tablero está oculto por CSS: tampoco se arrastra. */
  const sinSensores = useSensors()

  const deteccion = React.useCallback<CollisionDetection>((args) => {
    // El puntero manda mientras hay mouse; con teclado no hay puntero y
    // se cae a la geometría de las zonas.
    const bajoElPuntero = pointerWithin(args)
    return bajoElPuntero.length > 0 ? bajoElPuntero : closestCorners(args)
  }, [])

  const anuncios = React.useMemo<Announcements>(() => {
    const nombre = (id: UniqueIdentifier) =>
      porIdRef.current.get(String(id))?.paciente_nombre ?? 'la tarjeta'

    const destino = (over: Over | null) => {
      const datos = over?.data.current as DatosDrop | undefined
      if (!datos) return null
      if (datos.tipo === 'perdido') return 'la franja de perdidos'
      return `la columna ${ETIQUETA_COLUMNA[datos.columna]}`
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

    const columnaDestino: ClaveColumna = datos.columna
    if (columnaDeEstado(fila.estado) === columnaDestino) return

    void mover(fila, estadoDeColumna(columnaDestino))
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

    setGuardandoPerdido(true)
    const ok = await mover(fila, 'perdido', motivo, nota || null)
    setGuardandoPerdido(false)
    setPendientePerdido(null)

    if (ok) {
      toast.success(`${fila.paciente_nombre}: presupuesto marcado como perdido.`)
    }
  }

  const arrastrando = activa !== null
  const franjaHabilitada = activa === null || puedeMarcarsePerdido(activa.estado)

  return (
    <div className="flex flex-col gap-5">
      <Encabezado filtros={filtros} cantidad={total.cantidad} monto={total.monto} />

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
          sensors={esDesktop ? sensores : sinSensores}
          collisionDetection={deteccion}
          accessibility={{ announcements: anuncios, screenReaderInstructions: INSTRUCCIONES }}
          onDragStart={alLevantar}
          onDragEnd={alSoltar}
          onDragCancel={() => setActiva(null)}
        >
          {/* Sangra hasta los bordes del `<main>` para que el scroll
              horizontal del tablero no recorte las tarjetas. */}
          <div className="-mx-8 overflow-x-auto px-8 pb-1">
            <div className="grid min-w-[980px] grid-cols-5 gap-3">
              {CLAVES_COLUMNA.map((clave) => (
                <Columna
                  key={clave}
                  clave={clave}
                  filas={columnas[clave]}
                  enVuelo={enVuelo}
                  arrastrando={arrastrando}
                />
              ))}
            </div>
          </div>

          <FranjaPerdido
            resumen={perdidos}
            periodo={periodoPerdidos}
            arrastrando={arrastrando}
            habilitada={franjaHabilitada}
          />

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
