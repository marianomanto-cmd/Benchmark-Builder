'use client'

import { usePathname, useRouter } from 'next/navigation'
import * as React from 'react'
import { toast } from 'sonner'

import { ResponsiveModal } from '@/components/ui'
import { cambiarEstado, duplicarPresupuesto } from '@/app/actions/seguimiento'
import { ETIQUETA_ESTADO } from '@/lib/estados'
import { useAtajos } from '@/lib/hooks/use-atajos'
import type { EstadoPresupuesto, MotivoPerdida } from '@/lib/types'

import { DialogoEstado } from './dialogo-estado'
import { SheetWhatsApp } from './sheet-whatsapp'
import { Timeline } from './timeline'
import type { DatosSeguimiento } from './tipos'

/**
 * Todo lo interactivo del detalle cuelga de acá.
 *
 * Los diálogos se montan UNA sola vez, en el proveedor, y cualquier
 * parte de la pantalla los abre por contexto. Si cada botón montara su
 * propio modal habría dos copias del mismo estado (la de desktop y la
 * de la barra de mobile) y se desincronizarían al rotar el teléfono.
 *
 * El contenido de la pantalla sigue siendo Server Component: entra como
 * `children` y no se convierte en cliente por pasar por acá.
 *
 * **El estado vive acá, no en las props.** El badge, las transiciones
 * sugeridas y el reloj de días leen `estado` de este contexto: es el
 * valor optimista mientras el cambio viaja, y vuelve solo al del
 * servidor si la escritura falla.
 */

interface Contexto {
  /**
   * El estado que la pantalla tiene que mostrar AHORA: el del servidor,
   * o el destino elegido mientras la escritura viaja.
   */
  estado: EstadoPresupuesto
  /** Lo que se está mostrando todavía no lo confirmó el servidor. */
  proyectado: boolean
  /** Cambio directo, sin diálogo: las transiciones sugeridas a un clic. */
  cambiar: (estado: EstadoPresupuesto) => Promise<void>
  /** Abre el selector completo de estados. */
  abrirEstado: () => void
  /** Abre el selector de motivo de pérdida. */
  abrirPerdido: () => void
  abrirWhatsApp: () => void
  abrirHistorial: () => void
  duplicar: () => Promise<void>
  cambiando: boolean
  duplicando: boolean
  /** Estado destino que se está aplicando, para el spinner del botón. */
  aplicando: EstadoPresupuesto | null
}

const ContextoDetalle = React.createContext<Contexto | null>(null)

export function useDetalle(): Contexto {
  const ctx = React.useContext(ContextoDetalle)
  if (!ctx) {
    throw new Error('useDetalle() se usa adentro de <ProveedorDetalle>')
  }
  return ctx
}

export function ProveedorDetalle({
  datos,
  whatsappInicial,
  children,
}: {
  datos: DatosSeguimiento
  /** La URL traía `?whatsapp=1`: el wizard redirige así al guardar. */
  whatsappInicial: boolean
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()

  const [modoEstado, setModoEstado] = React.useState<'libre' | 'perdido' | null>(null)
  const [historialAbierto, setHistorialAbierto] = React.useState(false)
  const [whatsappAbierto, setWhatsappAbierto] = React.useState(whatsappInicial)
  const [duplicando, setDuplicando] = React.useState(false)

  /**
   * Cambio de estado optimista.
   *
   * Mover un presupuesto es la acción más frecuente del día y antes
   * costaba dos viajes: la server action y el `router.refresh()` que
   * vuelve a armar la pantalla en el servidor. Hasta que los dos
   * volvían, el badge seguía diciendo lo de antes y parecía que el
   * click no había hecho nada.
   *
   * Con `useOptimistic` el badge, las transiciones sugeridas y el reloj
   * cambian en el mismo frame del click. Si la escritura falla no hay
   * rollback que escribir a mano: la transición termina sin refrescar y
   * React vuelve solo al valor del servidor.
   */
  const [estado, proyectarEstado] = React.useOptimistic<EstadoPresupuesto, EstadoPresupuesto>(
    datos.estado,
    (_actual, destino) => destino,
  )
  const [enTransito, iniciarTransicion] = React.useTransition()

  // La query `?whatsapp=1` es una orden de una sola vez. Se limpia
  // apenas se abre el sheet para que un refresh o un "atrás" no lo
  // vuelvan a levantar solo.
  React.useEffect(() => {
    if (whatsappInicial) router.replace(pathname, { scroll: false })
  }, [whatsappInicial, router, pathname])

  /**
   * Guarda de doble envío cerrada en el mismo tick del primer click.
   * El `disabled` del botón necesita un render para aparecer, y a estas
   * acciones las disparan tres botones distintos más un atajo.
   */
  const enVuelo = React.useRef(false)

  const aplicar = React.useCallback(
    (
      destino: EstadoPresupuesto,
      motivo: MotivoPerdida | null,
      nota: string | null,
    ): Promise<boolean> => {
      if (enVuelo.current) return Promise.resolve(false)
      enVuelo.current = true

      return new Promise<boolean>((resolver) => {
        iniciarTransicion(async () => {
          // Dentro de la transición y antes del primer await: así el
          // valor optimista sobrevive hasta que el refresh trae el real.
          proyectarEstado(destino)
          try {
            const res = await cambiarEstado(datos.id, destino, motivo, nota)
            if (!res.ok) {
              toast.error(res.error)
              resolver(false)
              return
            }
            toast.success(`Ahora está en ${ETIQUETA_ESTADO[destino].toLowerCase()}.`)
            resolver(true)
            // El detalle, la home y el pipeline se arman en el servidor:
            // hay que pedirle al router los datos nuevos. La transición
            // sigue abierta hasta que llegan, y el valor optimista se
            // sostiene mientras tanto.
            router.refresh()
          } catch {
            toast.error('No se pudo cambiar el estado. Fijate la conexión y probá de nuevo.')
            resolver(false)
          } finally {
            enVuelo.current = false
          }
        })
      })
    },
    [datos.id, router, proyectarEstado],
  )

  const cambiar = React.useCallback(
    async (destino: EstadoPresupuesto) => {
      await aplicar(destino, null, null)
    },
    [aplicar],
  )

  const duplicandoRef = React.useRef(false)

  const duplicar = React.useCallback(async () => {
    // Duplicar CREA un documento: dos clicks rápidos creaban dos.
    if (duplicandoRef.current) return
    duplicandoRef.current = true
    setDuplicando(true)

    try {
      const res = await duplicarPresupuesto(datos.id)
      if (!res.ok) {
        toast.error(res.error)
        duplicandoRef.current = false
        setDuplicando(false)
        return
      }
      toast.success(
        res.numero
          ? `Se creó el ${res.numero} en borrador con los valores de hoy. El ${datos.numero} quedó intacto.`
          : `Se creó un presupuesto nuevo con los valores de hoy. El ${datos.numero} quedó intacto.`,
      )
      // Sin apagar el loading: la navegación tarda y el botón tiene que
      // seguir mostrando que algo está pasando hasta que se desmonta.
      router.push(`/presupuestos/${res.id}`)
    } catch {
      toast.error('No se pudo duplicar. Fijate la conexión y probá de nuevo.')
      duplicandoRef.current = false
      setDuplicando(false)
    }
  }, [datos.id, datos.numero, router])

  const abrirWhatsApp = React.useCallback(() => setWhatsappAbierto(true), [])
  const abrirEstado = React.useCallback(() => setModoEstado('libre'), [])
  const abrirPerdido = React.useCallback(() => setModoEstado('perdido'), [])
  const abrirHistorial = React.useCallback(() => setHistorialAbierto(true), [])

  /**
   * Lo que se repite todo el día, a una tecla. `useAtajos` ya ignora lo
   * que se tipea en un campo y lo que pasa con un modal abierto.
   */
  useAtajos({
    w: abrirWhatsApp,
    e: abrirEstado,
    p: () => window.open(`/api/presupuestos/${datos.id}/pdf`, '_blank', 'noopener,noreferrer'),
  })

  const proyectado = estado !== datos.estado

  const valor = React.useMemo<Contexto>(
    () => ({
      estado,
      proyectado,
      cambiar,
      abrirEstado,
      abrirPerdido,
      abrirWhatsApp,
      abrirHistorial,
      duplicar,
      cambiando: enTransito,
      duplicando,
      aplicando: proyectado ? estado : null,
    }),
    [
      estado,
      proyectado,
      cambiar,
      abrirEstado,
      abrirPerdido,
      abrirWhatsApp,
      abrirHistorial,
      duplicar,
      enTransito,
      duplicando,
    ],
  )

  return (
    <ContextoDetalle.Provider value={valor}>
      {children}

      {/* Lo que cambia solo tiene que poder anunciarse: el badge se
          mueve sin que nadie recargue nada. */}
      <p aria-live="polite" className="sr-only">
        {`Estado del presupuesto ${datos.numero}: ${ETIQUETA_ESTADO[estado]}.`}
      </p>

      {/* La `key` cambia con el modo: cada apertura remonta el diálogo
          con el motivo y la nota en blanco. */}
      <DialogoEstado
        key={modoEstado ?? 'cerrado'}
        open={modoEstado !== null}
        onOpenChange={(v) => setModoEstado(v ? (modoEstado ?? 'libre') : null)}
        estadoActual={estado}
        modo={modoEstado ?? 'libre'}
        guardando={enTransito}
        onConfirmar={aplicar}
      />

      <ResponsiveModal
        open={historialAbierto}
        onOpenChange={setHistorialAbierto}
        ancho="sm"
        titulo="Historial"
        descripcion="Todo lo que pasó con este presupuesto. No se edita ni se borra."
      >
        <Timeline eventos={datos.eventos} />
      </ResponsiveModal>

      <SheetWhatsApp
        presupuestoId={datos.id}
        open={whatsappAbierto}
        onOpenChange={setWhatsappAbierto}
      />
    </ContextoDetalle.Provider>
  )
}
