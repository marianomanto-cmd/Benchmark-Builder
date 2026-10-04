'use client'

import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragPendingEvent,
  type DragStartEvent,
  type Over,
  type ScreenReaderInstructions,
  type UniqueIdentifier,
} from '@dnd-kit/core'
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
import { SensorTeclado } from './sensor-teclado'
import { idTarjeta, TarjetaFantasma } from './tarjeta'
import {
  agruparPorColumna,
  CLAVES_COLUMNA,
  columnaDeEstado,
  diasTrasMover,
  estadoDeColumna,
  hayFiltros,
  resumir,
  resumirPerdidos,
  type ClaveColumna,
  type DatosDrop,
  type FilaPipeline,
  type OpcionFiltro,
} from './tipos'
import { deteccionTablero, destapar } from './zonas'

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
    'Con las flechas izquierda y derecha la llevás de una columna a otra, y volvé a presionar la barra espaciadora para soltarla. ' +
    'Con escape cancelás el movimiento y la tarjeta queda donde estaba. ' +
    'La franja de perdidos está debajo de las columnas: con la flecha abajo llegás a ella, y soltar ahí abre el selector de motivo.',
}

/**
 * Cuánto hay que mantener apretada una tarjeta con el dedo para que
 * levante, y cuánto se puede mover el dedo mientras tanto.
 *
 * En una pantalla táctil el mismo gesto —apoyar el dedo sobre una
 * tarjeta y deslizarlo— quiere decir dos cosas: scrollear el tablero o
 * mover la tarjeta. Antes ganaba siempre mover: con 6px de recorrido la
 * tarjeta ya levantaba, y como era `touch-action: none` la página nunca
 * se enteraba del gesto. En una tablet no había forma de scrollear
 * apoyando el dedo sobre una tarjeta, que es casi toda la pantalla, y
 * un deslizamiento en diagonal cambiaba el estado de un presupuesto.
 *
 * Ahora deslizar scrollea, y para mover hay que mantener apretado: el
 * mismo gesto que en cualquier lista del teléfono. Si el dedo se mueve
 * más de `TOLERANCIA_TACTIL` antes de tiempo, era un scroll.
 */
const ESPERA_TACTIL = 250
const TOLERANCIA_TACTIL = 8

/** Marca la tarjeta que un dedo está apretando (`data-apretada`), o ninguna. */
function marcarApretada(id: string | null) {
  document.querySelector('[data-apretada]')?.removeAttribute('data-apretada')
  if (id) document.getElementById(idTarjeta(id))?.setAttribute('data-apretada', '')
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
  /** Alto de la tarjeta levantada: el hueco del destino mide lo mismo. */
  const [altoActiva, setAltoActiva] = React.useState<number | null>(null)
  const [pendientePerdido, setPendientePerdido] = React.useState<FilaPipeline | null>(null)
  const [guardandoPerdido, setGuardandoPerdido] = React.useState(false)

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
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // Con el dedo, mantener apretado: deslizar es scrollear.
    useSensor(TouchSensor, {
      activationConstraint: { delay: ESPERA_TACTIL, tolerance: TOLERANCIA_TACTIL },
    }),
    useSensor(SensorTeclado),
  )

  /*
   * Destino de la tarjeta: `deteccionTablero` (zonas.ts).
   *
   * Sólo las zonas gruesas —las cinco columnas y la franja— son
   * destino, nunca una tarjeta: con `pointerWithin` sobre todos los
   * droppables, `over` era la tarjeta de abajo del puntero y ninguna
   * columna se prendía. Y con puntero manda el puntero y nada más:
   * `closestCorners` como reserva inventaba el destino más cercano
   * aunque se soltara a 150px del tablero, y eso escribía un cambio de
   * estado real en el historial append-only. Soltar donde no hay zona
   * es cancelar.
   *
   * Lo nuevo es que las zonas se miden en el momento y sólo en la parte
   * que se ve: el tablero scrollea con la página, los encabezados y la
   * franja quedan pegados, y lo que dnd-kit midió al levantar dejaba de
   * coincidir con la pantalla.
   */

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

  /**
   * Mientras un dedo mantiene apretada una tarjeta, la tarjeta lo
   * muestra con un anillo. Sin eso, la espera de `ESPERA_TACTIL` se
   * siente como que no pasa nada y la gente suelta antes de tiempo. Sólo
   * con el dedo: con el mouse el arrastre arranca por distancia, no por
   * tiempo.
   *
   * Es un atributo en el DOM y no estado de React a propósito: cada
   * scroll que empieza con el dedo sobre una tarjeta pasa por acá —y
   * otra vez al soltarse—, y con estado eso eran dos renders del
   * tablero entero, hasta 500 tarjetas, al principio de cada scroll.
   */
  function alApretar(evento: DragPendingEvent) {
    if ('delay' in evento.constraint) marcarApretada(String(evento.id))
  }

  function alLevantar(evento: DragStartEvent) {
    marcarApretada(null)
    setActiva(porId.get(String(evento.active.id)) ?? null)
    // Del DOM y no de `active.rect`: dnd-kit lo completa recién después
    // de este callback, y acá todavía tiene el de la tarjeta anterior.
    const tarjeta = document.getElementById(idTarjeta(String(evento.active.id)))
    setAltoActiva(tarjeta ? tarjeta.getBoundingClientRect().height : null)
    // Con el dedo, la tarjeta levantada queda debajo de la yema: el
    // toque de vibración (Android) es lo que confirma que agarró.
    if (typeof TouchEvent !== 'undefined' && evento.activatorEvent instanceof TouchEvent) {
      navigator.vibrate?.(10)
    }
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

  /**
   * El foco del teclado no queda debajo de lo que está pegado: ver
   * `destapar`. Sólo con foco de teclado (`:focus-visible`): un clic
   * sobre una tarjeta a medio tapar no tiene que mover la página.
   */
  function alEnfocar(evento: React.FocusEvent<HTMLElement>) {
    const destino = evento.target
    const tarjeta = destino.closest('article')
    if (tarjeta && destino.matches(':focus-visible')) destapar(tarjeta)
  }

  return (
    <div className="flex flex-col gap-5">
      <Encabezado
        filtros={filtros}
        cantidad={total.cantidad}
        monto={total.monto}
        filtrado={hayFiltros(filtros)}
      />

      {/*
        El tablero aparece en `md`, que es una tablet vertical.

        Antes aparecía en `lg`: en `md` las cinco columnas pedían 940px
        de piso y la caja mide 768, y el envoltorio scrolleaba de
        costado. La salida fue esconderlo, y un iPad vertical —la tablet
        de la recepción— se quedaba con un aviso de «se usa en
        escritorio» en lugar del tablero. Ahora no hay piso: las
        columnas se reparten el ancho, la tarjeta está hecha para entrar
        en 130px y lo largo se parte en dos líneas o se corta con puntos
        suspensivos. Debajo de `md`, un teléfono, el pipeline sigue
        siendo el listado de Home filtrado.
      */}
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
          collisionDetection={deteccionTablero}
          /* Sin autoscroll: todos los destinos están siempre a la vista
             —cada columna ocupa el alto entero del tablero y la franja
             está pegada al pie—, así que no hay adónde llevar la
             página. Con autoscroll, acercarse a la franja o a un
             encabezado para soltar correría el tablero por debajo. */
          autoScroll={false}
          accessibility={{ announcements: anuncios, screenReaderInstructions: INSTRUCCIONES }}
          onDragPending={alApretar}
          onDragAbort={() => marcarApretada(null)}
          onDragStart={alLevantar}
          onDragEnd={alSoltar}
          onDragCancel={() => setActiva(null)}
        >
          {/*
            UN SOLO SCROLL: el de la página.

            Antes el tablero medía lo que quedaba de la ventana
            (`useAltoTablero`) y cada columna scrolleaba por adentro.
            Eran cinco scrolls más el de la página, que igual se movía
            44px: la rueda hacía cosas distintas según dónde estuviera
            el mouse, y en una tablet horizontal cada columna mostraba
            DOS tarjetas enteras de 22. Ahora las columnas crecen con su
            contenido y scrollea la página, con la rueda en cualquier
            lado o con el dedo en cualquier lado. Lo que el scroll por
            columna cuidaba se sigue cuidando: el encabezado de cada
            columna —etapa, conteo y monto— queda pegado debajo de la
            topbar, y la franja de perdidos, pegada al pie.

            Las cinco columnas miden lo mismo (el grid las estira a la
            más alta): así el encabezado de cada una se queda pegado
            hasta el final del tablero, y cualquier columna es destino
            en cualquier punto del scroll.

            En `md` el tablero se come la mitad de la sangría del
            `<main>`: son 32px más para repartir entre cinco columnas
            de ~135, donde cada píxel es una letra más del nombre.
          */}
          <div className="flex flex-col md:-mx-4 lg:mx-0">
            <div className="grid grid-cols-5 gap-2 lg:gap-3" onFocus={alEnfocar}>
              {CLAVES_COLUMNA.map((clave) => (
                <Columna
                  key={clave}
                  clave={clave}
                  filas={columnas[clave]}
                  enVuelo={enVuelo}
                  activa={activa}
                  altoActiva={altoActiva}
                />
              ))}
            </div>

            {/* Pegada al pie: es resumen y es destino, y las dos cosas
                tienen que estar a mano sin scrollear hasta el final del
                tablero. El degradé de arriba deja ver que las tarjetas
                siguen por debajo. */}
            <div className="sticky bottom-0 z-20 bg-linear-to-b from-page/0 to-page to-[14px] pb-3 pt-3">
              <FranjaPerdido
                resumen={perdidos}
                periodo={periodoPerdidos}
                arrastrando={activa !== null}
                habilitada={franjaHabilitada}
              />
            </div>
          </div>

          {/* Sin animación de vuelta: la tarjeta ya está en su columna
              nueva, animarla hacia la vieja contaría otra historia. */}
          <DragOverlay dropAnimation={null} className="@container">
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
