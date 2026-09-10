'use client'

/**
 * Wizard de alta · pantallas 04-06.
 *
 * Es un modal sobre la ruta actual (`?nuevo=1`), montado una sola vez
 * en el layout de `(app)`: al cerrarlo, el listado de atrás sigue tal
 * cual estaba, con sus filtros y su scroll.
 *
 * Lo que se carga se autoguarda en localStorage con la hora a la vista.
 * Recién al guardar existe un documento: la RPC congela cabecera,
 * ítems y cuotas en una transacción y recalcula la cobertura del lado
 * del servidor. El cálculo que se ve mientras se carga es preview.
 */

import { Check, CircleAlert, FileDown, Loader2, MessageCircle, Save, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import * as React from 'react'
import { toast } from 'sonner'

import { crearPresupuesto, type PasoWizard } from '@/app/actions/presupuestos'
import { Banner, Button, Kbd, ResponsiveModal, Skeleton, useEsDesktop } from '@/components/ui'
import { cuotasSuman100 } from '@/lib/calculo'
import { borrarBorrador, leerBorrador, useAutoguardado } from '@/lib/draft'
import type { BorradorPresupuesto, CuotaBorrador, ItemBorrador } from '@/lib/types'
import { cn } from '@/lib/utils'

import { useAtajosWizard } from './atajos'
import { aPayload, borradorInicial } from './borrador'
import { ProveedorCapa, useContenedorCapas } from './capa'
import { usePacientes } from './consultas'
import { PasoCerrar } from './paso-cerrar'
import { PasoQue, enfocarBuscadorPrestacion } from './paso-que'
import { PasoQuien } from './paso-quien'
import { SelloGuardado } from './sello-guardado'
import { useTecladoVirtual } from './teclado'
import { useWizard } from './use-wizard'

const PASOS = [
  { n: 1 as const, titulo: 'Quién', sub: 'Paciente y cobertura' },
  { n: 2 as const, titulo: 'Qué', sub: 'Prestaciones' },
  { n: 3 as const, titulo: 'Cerrar', sub: 'Condiciones y envío' },
]

/** Dónde termina el usuario después de guardar. */
type Destino = 'detalle' | 'pdf' | 'whatsapp'

/** Lo que falló al emitir, con el paso donde se arregla. */
interface Fallo {
  mensaje: string
  paso?: PasoWizard
  destino: Destino
}

export function WizardPresupuesto() {
  // `useSearchParams` obliga a un límite de suspense para no arrastrar
  // a toda la pantalla de atrás al render del cliente.
  return (
    <React.Suspense fallback={null}>
      <WizardInterno />
    </React.Suspense>
  )
}

function WizardInterno() {
  const { abierto, cerrar } = useWizard()
  const router = useRouter()
  const esDesktop = useEsDesktop()

  const [borrador, setBorrador] = React.useState<BorradorPresupuesto | null>(null)
  const [guardando, setGuardando] = React.useState<Destino | null>(null)
  const [emitido, setEmitido] = React.useState<{ numero: string } | null>(null)
  const [fallo, setFallo] = React.useState<Fallo | null>(null)

  /**
   * Guarda dura contra el doble alta.
   *
   * El `disabled` del botón y el estado `guardando` dependen de que
   * React haya vuelto a pintar; un ref se cierra en el mismo tick del
   * primer click. Con tres botones que llaman a lo mismo (PDF, WhatsApp,
   * Guardar) y un ⌘⏎ que también dispara, la diferencia es un
   * presupuesto emitido dos veces, con dos números y dos PDFs.
   */
  const enVuelo = React.useRef(false)

  const { valor: valorCapa, setContenedor, hayCapa } = useContenedorCapas()

  const { data: pacientes = [] } = usePacientes()

  /** Para distinguir "todavía no guardé nada" de "lo descartaron". */
  const yaSeAutoguardo = React.useRef(false)

  /**
   * Cerrado el modal, el resultado de la vuelta anterior no tiene por
   * qué sobrevivir a la próxima apertura.
   *
   * El reset va en el render y no en un efecto: es el patrón de React
   * para ajustar estado cuando cambia una entrada. Comparando contra el
   * valor anterior se corrige en el mismo render, sin llegar a pintar
   * con el estado viejo. En un `useEffect` era un render en cascada —el
   * "presupuesto emitido" de la vuelta anterior alcanzaba a aparecer al
   * reabrir— y es lo que marca `react-hooks/set-state-in-effect`.
   */
  const [estabaAbierto, setEstabaAbierto] = React.useState(abierto)
  if (estabaAbierto !== abierto) {
    setEstabaAbierto(abierto)
    // Se limpia al **abrir**, no al cerrar: el modal tarda unos cuadros
    // en irse y borrar el "Presupuesto 2026-0341 guardado" al principio
    // de esa animación deja un parpadeo de esqueleto justo cuando la
    // persona está leyendo el número.
    if (abierto) {
      setEmitido(null)
      setFallo(null)
    }
  }

  /**
   * El borrador se resuelve del lado del cliente, nunca en el render
   * del servidor: la fecha de hoy depende de la zona horaria del
   * navegador y calcularla en el server rompería la hidratación.
   */
  React.useEffect(() => {
    if (!abierto) {
      enVuelo.current = false
      return
    }
    const almacenado = leerBorrador()
    setBorrador((actual) => {
      // Lo que está en memoria siempre es igual o más fresco que el
      // storage, así que gana; el storage sólo repone tras un F5.
      if (almacenado) return actual ?? almacenado
      // Storage vacío pero memoria con un borrador ya autoguardado: lo
      // descartaron desde el banner de la home. Se arranca de cero.
      if (actual && yaSeAutoguardo.current) {
        yaSeAutoguardo.current = false
        return borradorInicial()
      }
      return actual ?? borradorInicial()
    })
  }, [abierto])

  // Emitido el presupuesto, el borrador ya no se autoguarda: es un
  // documento en la base, no algo a medio cargar.
  const guardadoEn = useAutoguardado(abierto && !emitido ? borrador : null)

  React.useEffect(() => {
    if (guardadoEn) yaSeAutoguardo.current = true
  }, [guardadoEn])

  const parche = React.useCallback((cambios: Partial<BorradorPresupuesto>) => {
    setBorrador((b) => (b ? { ...b, ...cambios } : b))
  }, [])

  const setItems = React.useCallback((fn: (items: ItemBorrador[]) => ItemBorrador[]) => {
    setBorrador((b) => (b ? { ...b, items: fn(b.items) } : b))
  }, [])

  const setCuotas = React.useCallback((cuotas: CuotaBorrador[]) => {
    setBorrador((b) => (b ? { ...b, cuotas } : b))
  }, [])

  const paciente = React.useMemo(
    () => pacientes.find((p) => p.id === borrador?.paciente_id) ?? null,
    [pacientes, borrador?.paciente_id],
  )

  const paso = borrador?.paso ?? 1

  // El sheet de mobile no se achica solo cuando sube el teclado.
  const anclaTeclado = useTecladoVirtual(abierto && !esDesktop)

  function irAlPaso(n: 1 | 2 | 3) {
    parche({ paso: n })
    // Un error del servidor sobre el paso 1 deja de tener sentido apenas
    // se llega al paso 1 a arreglarlo.
    if (fallo?.paso === n) setFallo(null)
  }

  function siguiente() {
    if (!borrador) return
    if (borrador.paso === 1) {
      if (!borrador.paciente_id) {
        toast.error('Elegí el paciente antes de seguir')
        document.getElementById('w1-paciente')?.focus()
        return
      }
      if (!borrador.profesional_id) {
        toast.error('Elegí el profesional que firma el presupuesto')
        document.getElementById('w1-profesional')?.focus()
        return
      }
      irAlPaso(2)
      return
    }
    if (borrador.paso === 2) {
      if (borrador.items.length === 0) {
        toast.error('Agregá al menos una prestación')
        return
      }
      irAlPaso(3)
    }
  }

  async function guardar(destino: Destino) {
    if (!borrador || enVuelo.current) return

    // Elegir "enviar por WhatsApp" define el estado: el presupuesto sale
    // del consultorio en ese mismo acto.
    const aGuardar: BorradorPresupuesto =
      destino === 'whatsapp' ? { ...borrador, estado_inicial: 'enviado' } : borrador

    if (aGuardar.items.length === 0) {
      toast.error('Agregá al menos una prestación')
      irAlPaso(2)
      return
    }
    if (
      aGuardar.cuotas.length > 0 &&
      !cuotasSuman100(aGuardar.cuotas.map((c) => c.porcentaje))
    ) {
      toast.error('Las condiciones de pago tienen que sumar 100 %')
      return
    }
    const sinEtiqueta = aGuardar.cuotas.find((c) => !c.etiqueta.trim())
    if (sinEtiqueta) {
      toast.error('Cada condición de pago necesita un nombre')
      document.getElementById(`cuota-${sinEtiqueta.key}`)?.focus()
      return
    }

    // La pestaña del PDF se abre ANTES del await: si se abriera después,
    // el navegador la trataría como popup y la bloquearía.
    const pestanaPdf = destino === 'pdf' ? window.open('', '_blank') : null

    enVuelo.current = true
    setFallo(null)
    setGuardando(destino)
    const resultado = await crearPresupuesto(aPayload(aGuardar))

    if (!resultado.ok) {
      pestanaPdf?.close()
      setGuardando(null)
      enVuelo.current = false
      // El error queda a la vista y con qué hacer al lado: un toast se
      // va solo y deja al presupuesto entero cargado sin explicación.
      setFallo({ mensaje: resultado.error, paso: resultado.paso, destino })
      return
    }

    borrarBorrador()
    setBorrador(null)
    setEmitido({ numero: resultado.numero })

    if (pestanaPdf) {
      pestanaPdf.location.href = `/api/presupuestos/${resultado.id}/pdf`
    } else if (destino === 'pdf') {
      toast.info('El navegador bloqueó la pestaña del PDF. Lo tenés en el detalle.')
    }

    // Navegar al detalle deja el modal cerrado solo: `?nuevo=1` ya no está.
    router.push(
      destino === 'whatsapp'
        ? `/presupuestos/${resultado.id}?whatsapp=1`
        : `/presupuestos/${resultado.id}`,
    )
  }

  /**
   * Por qué no se puede seguir, o `null` si se puede.
   *
   * El paso 1 también bloquea: el profesional se autocompleta con el
   * usuario logueado, pero queda vacío si no tiene ficha en
   * `profesionales`. Sin esto, el error aparecía recién al guardar en
   * el paso 3, con el presupuesto entero ya cargado.
   *
   * El paso 3 bloquea por las condiciones de pago, que hasta ahora
   * viajaban al servidor y volvían como un rechazo: sumar 100 % y
   * tener nombre son dos cosas que se ven en pantalla, no hacía falta
   * el viaje.
   */
  const motivoBloqueo: string | null = !borrador
    ? null
    : paso === 1 && !borrador.paciente_id
      ? 'Elegí un paciente para seguir.'
      : paso === 1 && !borrador.profesional_id
        ? 'Elegí el profesional que firma el presupuesto.'
        : paso === 2 && borrador.items.length === 0
          ? 'Agregá al menos una prestación para seguir.'
          : paso === 3 &&
              borrador.cuotas.length > 0 &&
              !cuotasSuman100(borrador.cuotas.map((c) => c.porcentaje))
            ? 'Las condiciones de pago tienen que sumar 100 %.'
            : paso === 3 && borrador.cuotas.some((c) => !c.etiqueta.trim())
              ? 'Ponele un nombre a cada condición de pago.'
              : null

  const bloqueado = motivoBloqueo !== null
  const puedeGuardar = Boolean(borrador) && !bloqueado && !guardando && !emitido

  // ⌘⏎ hace lo mismo que el botón primario del paso, incluso desde
  // adentro de un campo de texto. Con un mini-form abierto manda el
  // mini-form, no el wizard.
  useAtajosWizard(abierto && !hayCapa && !emitido, {
    principal: () => {
      if (guardando) return
      if (paso < 3) {
        siguiente()
        return
      }
      // Con el botón deshabilitado el motivo se lee debajo; con el
      // atajo no hay botón que mirar, así que se dice.
      if (motivoBloqueo) {
        toast.error(motivoBloqueo)
        return
      }
      void guardar(borrador?.estado_inicial === 'enviado' ? 'whatsapp' : 'detalle')
    },
    buscar: paso === 2 ? enfocarBuscadorPrestacion : undefined,
  })

  const footer = !borrador || hayCapa || emitido ? null : (
    <div className="flex w-full flex-col gap-2 md:flex-row md:items-center">
      <Button
        variant="ghost"
        size="touch"
        className="order-last w-full md:order-first md:mr-auto md:h-[34px] md:w-auto"
        onClick={() => (paso === 1 ? cerrar() : irAlPaso((paso - 1) as 1 | 2))}
        disabled={Boolean(guardando)}
      >
        {paso === 1 ? 'Cancelar' : 'Atrás'}
      </Button>

      {paso < 3 ? (
        <div className="flex w-full flex-col gap-1 md:w-auto md:items-end">
          <Button
            variant="primary"
            size="touch"
            full
            className="md:h-[34px] md:w-auto"
            onClick={siguiente}
            disabled={bloqueado}
          >
            Siguiente
            <Kbd className="border-white/30 bg-white/15 text-white">⌘⏎</Kbd>
          </Button>
          {motivoBloqueo && (
            <p className="t-helper text-center md:text-right">{motivoBloqueo}</p>
          )}
        </div>
      ) : (
        <>
          <Button
            variant="secondary"
            size="touch"
            className="w-full md:h-[34px] md:w-auto"
            loading={guardando === 'pdf'}
            disabled={!puedeGuardar}
            onClick={() => void guardar('pdf')}
          >
            <FileDown aria-hidden />
            Descargar PDF
          </Button>

          <Button
            variant={borrador.estado_inicial === 'enviado' ? 'primary' : 'secondary'}
            size="touch"
            className="w-full md:h-[34px] md:w-auto"
            loading={guardando === 'whatsapp'}
            disabled={!puedeGuardar}
            onClick={() => void guardar('whatsapp')}
          >
            <MessageCircle aria-hidden />
            Guardar y enviar por WhatsApp
          </Button>

          {borrador.estado_inicial !== 'enviado' && (
            <Button
              variant="primary"
              size="touch"
              className="w-full md:h-[34px] md:w-auto"
              loading={guardando === 'detalle'}
              disabled={!puedeGuardar}
              onClick={() => void guardar('detalle')}
            >
              <Save aria-hidden />
              Guardar
              <Kbd className="border-white/30 bg-white/15 text-white">⌘⏎</Kbd>
            </Button>
          )}

          {motivoBloqueo && (
            <p className="t-helper w-full text-center md:w-auto md:text-right">{motivoBloqueo}</p>
          )}
        </>
      )}
    </div>
  )

  return (
    <ResponsiveModal
      open={abierto}
      onOpenChange={(v) => {
        // Mientras la RPC está en vuelo, cerrar dejaría el alta sin
        // pantalla que reporte el resultado.
        if (!v && !guardando) cerrar()
      }}
      titulo="Nuevo presupuesto"
      descripcion={PASOS[paso - 1]?.sub}
      // El paso 3 suma el preview del documento a la derecha.
      ancho={paso === 3 ? 'xl' : 'lg'}
      footer={footer}
    >
      <ProveedorCapa valor={valorCapa}>
        <div ref={anclaTeclado}>
          {/* Contenedor de los mini-forms: tapan el paso sin desmontarlo. */}
          <div ref={setContenedor} hidden={!hayCapa} />

          <div hidden={hayCapa}>
            {emitido ? (
              <Emitido numero={emitido.numero} />
            ) : borrador ? (
              <>
                <BarraPasos
                  paso={paso}
                  itemsCargados={borrador.items.length}
                  pacienteElegido={Boolean(borrador.paciente_id)}
                  profesionalElegido={Boolean(borrador.profesional_id)}
                  guardadoEn={guardadoEn}
                  onIr={irAlPaso}
                  onCerrar={cerrar}
                  guardando={Boolean(guardando)}
                />

                {fallo && (
                  <div className="mb-5">
                    <Banner
                      tono="warm"
                      icono={<CircleAlert className="size-5" />}
                      titulo="No se pudo emitir el presupuesto"
                      acciones={
                        <>
                          <Button
                            variant="primary"
                            size="touch"
                            className="md:h-[34px]"
                            loading={Boolean(guardando)}
                            disabled={bloqueado || Boolean(guardando)}
                            onClick={() => void guardar(fallo.destino)}
                          >
                            Reintentar
                          </Button>
                          {fallo.paso !== undefined && fallo.paso !== paso && (
                            <IrAlPaso paso={fallo.paso} onIr={irAlPaso} />
                          )}
                        </>
                      }
                    >
                      {fallo.mensaje} Lo cargado sigue acá y guardado en este dispositivo: no se
                      perdió nada.
                    </Banner>
                  </div>
                )}

                {paso === 1 && <PasoQuien borrador={borrador} parche={parche} />}
                {paso === 2 && (
                  <PasoQue borrador={borrador} setItems={setItems} esDesktop={esDesktop} />
                )}
                {paso === 3 && (
                  <PasoCerrar
                    borrador={borrador}
                    paciente={paciente}
                    parche={parche}
                    setCuotas={setCuotas}
                    esDesktop={esDesktop}
                  />
                )}
              </>
            ) : (
              <EsqueletoWizard />
            )}
          </div>
        </div>
      </ProveedorCapa>
    </ResponsiveModal>
  )
}

/** "Ir al paso 1" del banner de error: el campo que falló está allá. */
function IrAlPaso({ paso, onIr }: { paso: PasoWizard; onIr: (n: 1 | 2 | 3) => void }) {
  return (
    <Button
      variant="secondary"
      size="touch"
      className="md:h-[34px]"
      onClick={() => onIr(paso)}
    >
      Ir al paso {paso}
    </Button>
  )
}

/**
 * Entre el "ok" del servidor y la pantalla del detalle hay una
 * navegación que puede tardar. Un esqueleto ahí deja la duda de si
 * guardó; esto dice que sí y con qué número.
 */
function Emitido({ numero }: { numero: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center" role="status">
      <span className="grid size-11 place-items-center rounded-full bg-tint text-primary">
        <Check className="size-6" aria-hidden />
      </span>
      <div>
        <p className="font-sans text-[15px] font-semibold text-ink">
          {numero ? `Presupuesto ${numero} guardado` : 'Presupuesto guardado'}
        </p>
        <p className="t-helper mt-1 flex items-center justify-center gap-1.5">
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
          Abriendo el detalle…
        </p>
      </div>
    </div>
  )
}

/** Calca la forma del paso 1: barra de pasos y tres campos. */
function EsqueletoWizard() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <Skeleton className="size-6 rounded-full" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="size-6 rounded-full" />
        <Skeleton className="h-3 w-12" />
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <Skeleton className="h-2.5 w-20" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   Los tres pasos, siempre a la vista
   ═══════════════════════════════════════════════════════════ */

function BarraPasos({
  paso,
  itemsCargados,
  pacienteElegido,
  profesionalElegido,
  guardadoEn,
  onIr,
  onCerrar,
  guardando,
}: {
  paso: 1 | 2 | 3
  itemsCargados: number
  pacienteElegido: boolean
  profesionalElegido: boolean
  guardadoEn: string | null
  onIr: (n: 1 | 2 | 3) => void
  onCerrar: () => void
  /** Con la RPC en vuelo no se sale: ver la X de abajo. */
  guardando: boolean
}) {
  /**
   * Sólo se puede saltar a un paso ya alcanzado: nunca hacia adelante
   * sin datos.
   *
   * El profesional cuenta igual que el paciente: normalmente se
   * autocompleta con el usuario logueado, pero si no tiene ficha en
   * `profesionales` queda vacío. Sin esta condición el error recién
   * aparecía al guardar en el paso 3, con todo el presupuesto cargado.
   */
  const paso1Completo = pacienteElegido && profesionalElegido

  function alcanzable(n: 1 | 2 | 3) {
    if (n === 1) return true
    if (n === 2) return paso1Completo
    return paso1Completo && itemsCargados > 0
  }

  return (
    <div className="sticky top-0 z-20 -mx-5 -mt-4 mb-5 flex items-center gap-2 border-b border-hairline bg-card/95 px-5 py-3 backdrop-blur-sm md:-mx-6 md:-mt-5 md:px-6">
      <ol className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-3">
        {PASOS.map((p, i) => {
          const actual = p.n === paso
          const cumplido = p.n < paso
          const habilitado = alcanzable(p.n)

          return (
            <li key={p.n} className="flex min-w-0 items-center gap-1.5 sm:gap-3">
              {i > 0 && (
                <span aria-hidden className="h-px w-3 shrink-0 bg-hairline sm:w-6" />
              )}
              <button
                type="button"
                onClick={() => habilitado && onIr(p.n)}
                disabled={!habilitado}
                aria-current={actual ? 'step' : undefined}
                aria-label={`Paso ${p.n}: ${p.titulo}`}
                className={cn(
                  // 44px de área táctil en mobile, densidad de escritorio en md.
                  'flex min-h-11 min-w-0 items-center gap-2 rounded-pill py-1 pl-1 pr-2 text-left transition-colors md:min-h-0',
                  habilitado ? 'hover:bg-tint' : 'cursor-not-allowed opacity-45',
                )}
              >
                <span
                  className={cn(
                    'grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold tabular-nums',
                    actual && 'bg-primary text-white',
                    cumplido && 'bg-tint text-primary-hover',
                    !actual && !cumplido && 'border border-hairline text-faint',
                  )}
                >
                  {cumplido ? <Check className="size-3.5" aria-hidden /> : p.n}
                </span>
                <span
                  aria-hidden
                  className={cn(
                    'truncate font-sans text-[13px]',
                    actual ? 'font-semibold text-ink' : 'text-muted',
                    // En pantallas chicas sólo se lee el nombre del paso actual.
                    !actual && 'hidden sm:inline',
                  )}
                >
                  {p.titulo}
                </span>
              </button>
            </li>
          )
        })}
      </ol>

      <SelloGuardado guardadoEn={guardadoEn} />

      {/*
        En mobile el sheet no trae botón de cerrar: sólo el gesto.

        Va deshabilitada mientras se emite. El `onOpenChange` del modal
        ya bloqueaba el Escape y el clic afuera, pero esta X llamaba a
        `cerrar` derecho: en mobile —que es donde se carga la mayoría de
        los presupuestos— era la única salida que se saltaba la guarda, y
        cerrar acá deja el alta en vuelo sin ninguna pantalla que cuente
        cómo terminó.
      */}
      <Button
        variant="ghost"
        size="icon-touch"
        className="-mr-2 shrink-0 md:hidden"
        onClick={onCerrar}
        disabled={guardando}
        aria-label="Cerrar el wizard"
      >
        <X aria-hidden />
      </Button>
    </div>
  )
}
