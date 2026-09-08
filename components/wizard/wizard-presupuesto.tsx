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

import { Check, FileDown, MessageCircle, Save, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import * as React from 'react'
import { toast } from 'sonner'

import { crearPresupuesto } from '@/app/actions/presupuestos'
import { Button, ResponsiveModal, Skeleton, useEsDesktop } from '@/components/ui'
import { cuotasSuman100 } from '@/lib/calculo'
import { borrarBorrador, leerBorrador, useAutoguardado } from '@/lib/draft'
import type { BorradorPresupuesto, CuotaBorrador, ItemBorrador } from '@/lib/types'
import { cn } from '@/lib/utils'

import { aPayload, borradorInicial } from './borrador'
import { ProveedorCapa, useContenedorCapas } from './capa'
import { usePacientes } from './consultas'
import { PasoCerrar } from './paso-cerrar'
import { PasoQue } from './paso-que'
import { PasoQuien } from './paso-quien'
import { useWizard } from './use-wizard'

const PASOS = [
  { n: 1 as const, titulo: 'Quién', sub: 'Paciente y cobertura' },
  { n: 2 as const, titulo: 'Qué', sub: 'Prestaciones' },
  { n: 3 as const, titulo: 'Cerrar', sub: 'Condiciones y envío' },
]

/** Dónde termina el usuario después de guardar. */
type Destino = 'detalle' | 'pdf' | 'whatsapp'

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

  const { valor: valorCapa, setContenedor, hayCapa } = useContenedorCapas()

  const { data: pacientes = [] } = usePacientes()

  /** Para distinguir "todavía no guardé nada" de "lo descartaron". */
  const yaSeAutoguardo = React.useRef(false)

  /**
   * El borrador se resuelve del lado del cliente, nunca en el render
   * del servidor: la fecha de hoy depende de la zona horaria del
   * navegador y calcularla en el server rompería la hidratación.
   */
  React.useEffect(() => {
    if (!abierto) return
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

  const guardadoEn = useAutoguardado(abierto ? borrador : null)

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

  function irAlPaso(n: 1 | 2 | 3) {
    parche({ paso: n })
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
      irAlPaso(3)
    }
  }

  async function guardar(destino: Destino) {
    if (!borrador || guardando) return

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

    // La pestaña del PDF se abre ANTES del await: si se abriera después,
    // el navegador la trataría como popup y la bloquearía.
    const pestanaPdf = destino === 'pdf' ? window.open('', '_blank') : null

    setGuardando(destino)
    const resultado = await crearPresupuesto(aPayload(aGuardar))

    if (!resultado.ok) {
      pestanaPdf?.close()
      setGuardando(null)
      toast.error(resultado.error)
      return
    }

    borrarBorrador()
    setBorrador(null)
    setGuardando(null)
    toast.success(
      resultado.numero
        ? `Presupuesto ${resultado.numero} guardado`
        : 'Presupuesto guardado',
    )

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

  const siguienteDeshabilitado = paso === 2 && (borrador?.items.length ?? 0) === 0

  const footer = !borrador ? null : hayCapa ? null : (
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
            disabled={siguienteDeshabilitado}
          >
            Siguiente
          </Button>
          {siguienteDeshabilitado && (
            <p className="t-helper text-center md:text-right">
              Agregá al menos una prestación para seguir.
            </p>
          )}
        </div>
      ) : (
        <>
          <Button
            variant="secondary"
            size="touch"
            className="w-full md:h-[34px] md:w-auto"
            loading={guardando === 'pdf'}
            disabled={Boolean(guardando)}
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
            disabled={Boolean(guardando)}
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
              disabled={Boolean(guardando)}
              onClick={() => void guardar('detalle')}
            >
              <Save aria-hidden />
              Guardar
            </Button>
          )}
        </>
      )}
    </div>
  )

  return (
    <ResponsiveModal
      open={abierto}
      onOpenChange={(v) => {
        if (!v) cerrar()
      }}
      titulo="Nuevo presupuesto"
      descripcion={PASOS[paso - 1]?.sub}
      // El paso 3 suma el preview del documento a la derecha.
      ancho={paso === 3 ? 'xl' : 'lg'}
      footer={footer}
    >
      <ProveedorCapa valor={valorCapa}>
        {/* Contenedor de los mini-forms: tapan el paso sin desmontarlo. */}
        <div ref={setContenedor} hidden={!hayCapa} />

        <div hidden={hayCapa}>
          {borrador ? (
            <>
              <BarraPasos
                paso={paso}
                itemsCargados={borrador.items.length}
                pacienteElegido={Boolean(borrador.paciente_id)}
                onIr={irAlPaso}
                onCerrar={cerrar}
              />

              {paso === 1 && (
                <PasoQuien borrador={borrador} parche={parche} guardadoEn={guardadoEn} />
              )}
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
            <div className="flex flex-col gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-2/3" />
              <Skeleton className="h-10 w-1/2" />
            </div>
          )}
        </div>
      </ProveedorCapa>
    </ResponsiveModal>
  )
}

/* ═══════════════════════════════════════════════════════════
   Los tres pasos, siempre a la vista
   ═══════════════════════════════════════════════════════════ */

function BarraPasos({
  paso,
  itemsCargados,
  pacienteElegido,
  onIr,
  onCerrar,
}: {
  paso: 1 | 2 | 3
  itemsCargados: number
  pacienteElegido: boolean
  onIr: (n: 1 | 2 | 3) => void
  onCerrar: () => void
}) {
  /** Sólo se puede saltar a un paso ya alcanzado: nunca hacia adelante sin datos. */
  function alcanzable(n: 1 | 2 | 3) {
    if (n === 1) return true
    if (n === 2) return pacienteElegido
    return pacienteElegido && itemsCargados > 0
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
                className={cn(
                  'flex min-w-0 items-center gap-2 rounded-pill py-1 pl-1 pr-2 text-left transition-colors',
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

      {/* En mobile el sheet no trae botón de cerrar: sólo el gesto. */}
      <Button
        variant="ghost"
        size="icon-touch"
        className="-mr-2 shrink-0 md:hidden"
        onClick={onCerrar}
        aria-label="Cerrar el wizard"
      >
        <X aria-hidden />
      </Button>
    </div>
  )
}
