'use client'

import * as PopoverPrimitive from '@radix-ui/react-popover'
import { Command } from 'cmdk'
import { Check, ChevronsUpDown, Loader2, Plus, Search } from 'lucide-react'
import * as React from 'react'

import { normalizar } from '@/lib/formato'
import { cn } from '@/lib/utils'

export interface OpcionCombobox {
  value: string
  label: string
  /** Segunda línea: DNI, obra social, rubro, matrícula. */
  detalle?: string
  /** Texto extra por el que también se puede buscar. */
  busqueda?: string
  /** Se muestra a la derecha: monto, pill. */
  accesorio?: React.ReactNode
  deshabilitada?: boolean
}

/**
 * Patrón cmdk del handoff §07-08:
 *   resultados → **"Crear «lo tipeado»"** siempre visible → recientes.
 *   ↑↓ navega, ⏎ selecciona.
 *
 * `onCrear` recibe el texto tipeado y abre el mini-form. Al guardar, el
 * mini-form devuelve la entidad ya seleccionada.
 */
export function Combobox({
  value,
  onChange,
  opciones,
  recientes = [],
  placeholder = 'Buscar…',
  vacio = 'Sin resultados',
  onCrear,
  etiquetaCrear = 'Crear',
  cargando,
  disabled,
  id,
  invalido,
  className,
}: {
  value: string | null
  onChange: (value: string, opcion: OpcionCombobox) => void
  opciones: OpcionCombobox[]
  recientes?: OpcionCombobox[]
  placeholder?: string
  vacio?: string
  onCrear?: (texto: string) => void
  etiquetaCrear?: string
  cargando?: boolean
  disabled?: boolean
  id?: string
  invalido?: boolean
  className?: string
}) {
  const [abierto, setAbierto] = React.useState(false)
  const [texto, setTexto] = React.useState('')
  // `role="combobox"` exige apuntar al listado que controla, para que
  // el lector de pantalla sepa qué se abre y qué se está navegando.
  const idListado = React.useId()

  const seleccionada = React.useMemo(
    () => opciones.find((o) => o.value === value) ?? recientes.find((o) => o.value === value),
    [opciones, recientes, value],
  )

  const filtradas = React.useMemo(() => {
    const q = normalizar(texto)
    if (!q) return opciones
    return opciones.filter((o) =>
      normalizar(`${o.label} ${o.detalle ?? ''} ${o.busqueda ?? ''}`).includes(q),
    )
  }, [opciones, texto])

  const recientesVisibles = React.useMemo(
    () => (texto ? [] : recientes.filter((r) => !filtradas.some((f) => f.value === r.value))),
    [recientes, filtradas, texto],
  )

  function elegir(o: OpcionCombobox) {
    onChange(o.value, o)
    setAbierto(false)
    setTexto('')
  }

  return (
    <PopoverPrimitive.Root open={abierto} onOpenChange={setAbierto}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          id={id}
          role="combobox"
          aria-expanded={abierto}
          aria-controls={idListado}
          aria-haspopup="listbox"
          aria-invalid={invalido || undefined}
          disabled={disabled}
          className={cn(
            'flex h-9 w-full items-center justify-between gap-2 rounded-input border border-hairline bg-card px-3',
            'text-left font-sans text-[14px] transition-colors',
            'hover:border-primary/30',
            'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25',
            'disabled:cursor-not-allowed disabled:bg-[#F8FAFB] disabled:text-faint',
            invalido && 'border-warm-line focus:border-warm-line focus:ring-warm-line/25',
            className,
          )}
        >
          <span className={cn('truncate', seleccionada ? 'text-ink' : 'text-faint')}>
            {seleccionada?.label ?? placeholder}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-faint" aria-hidden />
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={6}
          className={cn(
            'z-50 w-[var(--radix-popover-trigger-width)] min-w-[280px] overflow-hidden',
            'rounded-card border border-hairline bg-card shadow-lift animate-enter',
          )}
        >
          <Command shouldFilter={false} loop>
            <div className="flex items-center gap-2 border-b border-hairline px-3">
              <Search className="size-4 shrink-0 text-faint" aria-hidden />
              <Command.Input
                autoFocus
                value={texto}
                onValueChange={setTexto}
                placeholder={placeholder}
                className="h-10 w-full bg-transparent font-sans text-[14px] text-ink outline-none placeholder:text-faint"
              />
              {cargando && <Loader2 className="size-4 animate-spin text-faint" aria-hidden />}
            </div>

            <Command.List
              id={idListado}
              role="listbox"
              className="max-h-[280px] overflow-y-auto p-1.5"
            >
              {filtradas.length === 0 && !onCrear && (
                <Command.Empty className="px-3 py-6 text-center text-[13px] text-muted">
                  {vacio}
                </Command.Empty>
              )}

              {filtradas.length > 0 && (
                <Command.Group>
                  {filtradas.map((o) => (
                    <Item
                      key={o.value}
                      opcion={o}
                      seleccionada={o.value === value}
                      onSelect={() => elegir(o)}
                    />
                  ))}
                </Command.Group>
              )}

              {/* "Crear «lo tipeado»" siempre visible. */}
              {onCrear && (
                <Command.Item
                  value={`__crear__${texto}`}
                  onSelect={() => {
                    setAbierto(false)
                    onCrear(texto.trim())
                    setTexto('')
                  }}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-input px-2.5 py-2',
                    'font-sans text-[13px] font-medium text-primary-hover',
                    'data-[selected=true]:bg-tint',
                    filtradas.length > 0 && 'mt-1 border-t border-hairline pt-2.5',
                  )}
                >
                  <Plus className="size-4 shrink-0" aria-hidden />
                  {texto.trim() ? (
                    <span className="truncate">
                      {etiquetaCrear} «{texto.trim()}»
                    </span>
                  ) : (
                    <span>{etiquetaCrear}…</span>
                  )}
                </Command.Item>
              )}

              {recientesVisibles.length > 0 && (
                <Command.Group
                  heading="Recientes"
                  className="mt-1 [&_[cmdk-group-heading]]:t-label [&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2"
                >
                  {recientesVisibles.map((o) => (
                    <Item
                      key={o.value}
                      opcion={o}
                      seleccionada={o.value === value}
                      onSelect={() => elegir(o)}
                    />
                  ))}
                </Command.Group>
              )}
            </Command.List>
          </Command>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}

function Item({
  opcion,
  seleccionada,
  onSelect,
}: {
  opcion: OpcionCombobox
  seleccionada: boolean
  onSelect: () => void
}) {
  return (
    <Command.Item
      value={opcion.value}
      disabled={opcion.deshabilitada}
      onSelect={onSelect}
      className={cn(
        'flex cursor-pointer items-center gap-2.5 rounded-input px-2.5 py-2',
        'data-[selected=true]:bg-tint data-[disabled=true]:opacity-40 data-[disabled=true]:cursor-not-allowed',
      )}
    >
      <Check
        className={cn('size-4 shrink-0 text-primary', seleccionada ? 'opacity-100' : 'opacity-0')}
        aria-hidden
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-sans text-[14px] text-ink">{opcion.label}</span>
        {opcion.detalle && (
          <span className="block truncate t-helper">{opcion.detalle}</span>
        )}
      </span>
      {opcion.accesorio && <span className="shrink-0">{opcion.accesorio}</span>}
    </Command.Item>
  )
}
