'use client'

import { usePathname, useRouter } from 'next/navigation'
import * as React from 'react'
import { toast } from 'sonner'

import { ResponsiveModal } from '@/components/ui'
import { cambiarEstado, duplicarPresupuesto } from '@/app/actions/seguimiento'
import { ETIQUETA_ESTADO } from '@/lib/estados'
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
 */

interface Contexto {
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
  const [aplicando, setAplicando] = React.useState<EstadoPresupuesto | null>(null)
  const [duplicando, setDuplicando] = React.useState(false)

  // La query `?whatsapp=1` es una orden de una sola vez. Se limpia
  // apenas se abre el sheet para que un refresh o un "atrás" no lo
  // vuelvan a levantar solo.
  React.useEffect(() => {
    if (whatsappInicial) router.replace(pathname, { scroll: false })
  }, [whatsappInicial, router, pathname])

  const aplicar = React.useCallback(
    async (
      estado: EstadoPresupuesto,
      motivo: MotivoPerdida | null,
      nota: string | null,
    ): Promise<boolean> => {
      setAplicando(estado)
      try {
        const res = await cambiarEstado(datos.id, estado, motivo, nota)
        if (!res.ok) {
          toast.error(res.error)
          return false
        }
        toast.success(`Ahora está en ${ETIQUETA_ESTADO[estado].toLowerCase()}.`)
        // El detalle, la home y el pipeline se arman en el servidor:
        // hay que pedirle al router los datos nuevos.
        router.refresh()
        return true
      } catch {
        toast.error('No se pudo cambiar el estado. Fijate la conexión y probá de nuevo.')
        return false
      } finally {
        setAplicando(null)
      }
    },
    [datos.id, router],
  )

  const cambiar = React.useCallback(
    async (estado: EstadoPresupuesto) => {
      await aplicar(estado, null, null)
    },
    [aplicar],
  )

  const duplicar = React.useCallback(async () => {
    setDuplicando(true)
    try {
      const res = await duplicarPresupuesto(datos.id)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success(
        res.numero
          ? `Se creó el ${res.numero} con los valores de hoy. El ${datos.numero} quedó intacto.`
          : `Se creó un presupuesto nuevo con los valores de hoy. El ${datos.numero} quedó intacto.`,
      )
      router.push(`/presupuestos/${res.id}`)
    } catch {
      toast.error('No se pudo duplicar. Fijate la conexión y probá de nuevo.')
    } finally {
      setDuplicando(false)
    }
  }, [datos.id, datos.numero, router])

  const valor = React.useMemo<Contexto>(
    () => ({
      cambiar,
      abrirEstado: () => setModoEstado('libre'),
      abrirPerdido: () => setModoEstado('perdido'),
      abrirWhatsApp: () => setWhatsappAbierto(true),
      abrirHistorial: () => setHistorialAbierto(true),
      duplicar,
      cambiando: aplicando !== null,
      duplicando,
      aplicando,
    }),
    [cambiar, duplicar, aplicando, duplicando],
  )

  return (
    <ContextoDetalle.Provider value={valor}>
      {children}

      {/* La `key` cambia con el modo: cada apertura remonta el diálogo
          con el motivo y la nota en blanco. */}
      <DialogoEstado
        key={modoEstado ?? 'cerrado'}
        open={modoEstado !== null}
        onOpenChange={(v) => setModoEstado(v ? (modoEstado ?? 'libre') : null)}
        estadoActual={datos.estado}
        modo={modoEstado ?? 'libre'}
        guardando={aplicando !== null}
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
