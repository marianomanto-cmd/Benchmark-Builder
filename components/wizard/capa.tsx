'use client'

/**
 * Capa de mini-form dentro del wizard.
 *
 * Un mini-form (crear paciente, obra social, prestación, arancel) NO
 * abre un segundo modal encima del wizard: se dibuja *dentro* del mismo
 * modal, tapando el paso. Razones:
 *
 *   · en mobile el wizard ya es un sheet full-screen; apilar otro sheet
 *     encima deja dos handles y dos gestos de arrastre compitiendo;
 *   · el foco vuelve solo al campo que disparó la creación, sin pelear
 *     con dos focus scopes anidados;
 *   · el paso queda montado detrás (`hidden`), así no se pierde nada de
 *     lo ya cargado.
 *
 * El componente que quiere crear algo renderiza su formulario adentro
 * de `<Capa abierta={…}>`; el portal lo lleva al contenedor que el
 * wizard reserva arriba de todo.
 */

import * as React from 'react'
import { createPortal } from 'react-dom'

import { ChevronLeft } from 'lucide-react'

import { Button } from '@/components/ui'

interface ValorCapa {
  contenedor: HTMLElement | null
  /** +1 al abrir una capa, -1 al cerrarla. */
  sumar: (n: number) => void
}

const CtxCapa = React.createContext<ValorCapa | null>(null)

export function ProveedorCapa({
  valor,
  children,
}: {
  valor: ValorCapa
  children: React.ReactNode
}) {
  return <CtxCapa.Provider value={valor}>{children}</CtxCapa.Provider>
}

/** Estado del contenedor de capas, para el shell del wizard. */
export function useContenedorCapas() {
  const [contenedor, setContenedor] = React.useState<HTMLDivElement | null>(null)
  const [abiertas, setAbiertas] = React.useState(0)

  const sumar = React.useCallback((n: number) => {
    setAbiertas((c) => Math.max(0, c + n))
  }, [])

  const valor = React.useMemo<ValorCapa>(() => ({ contenedor, sumar }), [contenedor, sumar])

  return { valor, setContenedor, hayCapa: abiertas > 0 }
}

export function Capa({
  abierta,
  children,
}: {
  abierta: boolean
  children: React.ReactNode
}) {
  const ctx = React.useContext(CtxCapa)
  const sumar = ctx?.sumar

  React.useEffect(() => {
    if (!abierta || !sumar) return
    sumar(1)
    return () => sumar(-1)
  }, [abierta, sumar])

  if (!abierta || !ctx?.contenedor) return null
  return createPortal(children, ctx.contenedor)
}

/**
 * Encabezado común de los mini-forms: volver + título + por qué estás
 * acá. El "porqué" no es decorativo — en el mini-form de arancel es la
 * única explicación de por qué el flujo se interrumpió.
 */
export function CabeceraCapa({
  titulo,
  ayuda,
  onVolver,
}: {
  titulo: string
  ayuda?: React.ReactNode
  onVolver: () => void
}) {
  return (
    <div className="mb-4 flex flex-col gap-2">
      <div>
        <Button variant="ghost" size="sm" onClick={onVolver} className="-ml-2">
          <ChevronLeft aria-hidden />
          Volver
        </Button>
      </div>
      <div>
        <h3 className="t-h3">{titulo}</h3>
        {ayuda && <p className="t-helper mt-1">{ayuda}</p>}
      </div>
    </div>
  )
}

/**
 * Pie común de los mini-forms. El botón de guardar es el primario de la
 * capa: mientras el mini-form está abierto, el del wizard no se ve.
 */
export function PieCapa({
  etiqueta,
  onCancelar,
  onGuardar,
  guardando,
  deshabilitado,
}: {
  etiqueta: string
  onCancelar: () => void
  onGuardar: () => void
  guardando?: boolean
  deshabilitado?: boolean
}) {
  return (
    <div className="mt-6 flex flex-col-reverse gap-2 border-t border-hairline pt-4 sm:flex-row sm:justify-end">
      <Button variant="ghost" size="touch" className="sm:h-[34px]" onClick={onCancelar}>
        Cancelar
      </Button>
      <Button
        variant="primary"
        size="touch"
        className="sm:h-[34px]"
        onClick={onGuardar}
        loading={guardando}
        disabled={deshabilitado}
      >
        {etiqueta}
      </Button>
    </div>
  )
}

/**
 * Mueve el foco al campo siguiente después de crear una entidad al
 * vuelo. Va en el siguiente frame porque el campo destino recién existe
 * cuando el paso vuelve a ser visible.
 */
export function enfocar(id: string | undefined): void {
  if (!id || typeof window === 'undefined') return
  window.requestAnimationFrame(() => {
    const el = document.getElementById(id)
    if (el instanceof HTMLElement) el.focus()
  })
}
