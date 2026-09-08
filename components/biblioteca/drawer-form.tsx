'use client'

import { TriangleAlert } from 'lucide-react'
import * as React from 'react'

import { Banner, Button, Drawer } from '@/components/ui'

/**
 * Cáscara común de los cuatro drawers de alta/edición del catálogo.
 *
 * El botón de guardar vive en el footer del drawer, que está fuera del
 * `<form>`: se lo asocia con `form={id}` en vez de duplicar handlers.
 * Así ⏎ dentro de cualquier campo también guarda.
 */
export function DrawerForm({
  open,
  onOpenChange,
  titulo,
  descripcion,
  formId,
  guardando,
  error,
  onSubmit,
  textoGuardar = 'Guardar',
  children,
  ancho = 'md',
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  titulo: string
  descripcion?: React.ReactNode
  formId: string
  guardando: boolean
  error: string | null
  onSubmit: () => void
  textoGuardar?: string
  children: React.ReactNode
  ancho?: 'md' | 'lg'
}) {
  return (
    <Drawer
      open={open}
      // Mientras se guarda no se cierra: el usuario perdería lo tipeado
      // sin saber si quedó o no.
      onOpenChange={(v) => {
        if (!guardando) onOpenChange(v)
      }}
      titulo={titulo}
      descripcion={descripcion}
      ancho={ancho}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            size="touch"
            className="sm:h-[34px]"
            disabled={guardando}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form={formId}
            variant="primary"
            size="touch"
            className="sm:h-[34px]"
            loading={guardando}
          >
            {textoGuardar}
          </Button>
        </div>
      }
    >
      <form
        id={formId}
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit()
        }}
        className="space-y-4"
      >
        {error && (
          <Banner tono="warm" icono={<TriangleAlert className="size-4" />} titulo="No se guardó">
            {error}
          </Banner>
        )}
        {children}
      </form>
    </Drawer>
  )
}

/**
 * Fila de dos campos en desktop, apilados en mobile. Los formularios
 * del catálogo son cortos: no hace falta un sistema de grillas.
 */
export function FilaCampos({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>
}

/** Switch con su etiqueta y su explicación, alineado como una fila. */
export function FilaSwitch({
  id,
  titulo,
  ayuda,
  children,
}: {
  id: string
  titulo: string
  ayuda?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-input border border-hairline px-3 py-2.5">
      <label htmlFor={id} className="min-w-0">
        <span className="block font-sans text-[14px] font-medium text-ink">{titulo}</span>
        {ayuda && <span className="block t-helper">{ayuda}</span>}
      </label>
      {children}
    </div>
  )
}
