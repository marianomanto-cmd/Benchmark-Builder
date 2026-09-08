'use client'

import { CalendarDays, Check, ChevronDown, LayoutGrid, List, Search, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as React from 'react'

import {
  Button,
  EstadoBadge,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
import { ESTADOS, ETIQUETA_ESTADO } from '@/lib/estados'
import { fechaCorta } from '@/lib/formato'
import type { EstadoPresupuesto } from '@/lib/types'
import { cn } from '@/lib/utils'

import { construirUrl, contarFiltros, FILTROS_VACIOS, hayFiltrosActivos } from './filtros-url'
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from './popover'
import { OBRA_SOCIAL_PARTICULAR, type FiltrosHome, type OpcionFiltro } from './tipos'

/** Sentinela de los `Select`: Radix no acepta `value=""`. */
const TODOS = 'todos'

const RETARDO_BUSQUEDA = 350

/**
 * Barra de filtros sticky.
 *
 * Todo lo que se elige acá termina en la URL: el back del navegador
 * deshace un filtro y el link se puede compartir por chat tal cual.
 * La búsqueda usa `replace` (no ensucia el historial con cada tecla);
 * el resto usa `push`, que es lo que hace que "atrás" funcione.
 */
export function BarraFiltros({
  filtros,
  profesionales,
  obrasSociales,
}: {
  filtros: FiltrosHome
  profesionales: OpcionFiltro[]
  obrasSociales: OpcionFiltro[]
}) {
  const router = useRouter()
  const [pendiente, iniciarTransicion] = React.useTransition()
  const [texto, setTexto] = React.useState(filtros.q)
  /** Último término que mandamos nosotros a la URL. */
  const enviado = React.useRef(filtros.q)

  React.useEffect(() => {
    // Si la URL cambió por afuera (back, link pegado), el input acompaña.
    // Si el cambio lo produjo nuestro propio `replace`, no se pisa lo que
    // el usuario siguió tipeando mientras la navegación estaba en vuelo.
    if (filtros.q === enviado.current) return
    enviado.current = filtros.q
    setTexto(filtros.q)
  }, [filtros.q])

  React.useEffect(() => {
    if (texto === filtros.q) return
    const t = setTimeout(() => {
      enviado.current = texto
      iniciarTransicion(() => {
        router.replace(construirUrl({ ...filtros, q: texto }), { scroll: false })
      })
    }, RETARDO_BUSQUEDA)
    return () => clearTimeout(t)
  }, [texto, filtros, router])

  const aplicar = React.useCallback(
    (parcial: Partial<FiltrosHome>) => {
      iniciarTransicion(() => {
        router.push(construirUrl({ ...filtros, ...parcial }), { scroll: false })
      })
    },
    [filtros, router],
  )

  function alternarEstado(estado: EstadoPresupuesto) {
    const activo = filtros.estados.includes(estado)
    aplicar({
      estados: activo
        ? filtros.estados.filter((e) => e !== estado)
        : [...filtros.estados, estado],
    })
  }

  const activos = hayFiltrosActivos(filtros)
  const cantidad = contarFiltros(filtros)

  const etiquetaEstados =
    filtros.estados.length === 0
      ? 'Estado'
      : filtros.estados.length === 1
        ? ETIQUETA_ESTADO[filtros.estados[0]]
        : `${filtros.estados.length} estados`

  const etiquetaFechas =
    filtros.desde && filtros.hasta
      ? `${fechaCorta(filtros.desde)} – ${fechaCorta(filtros.hasta)}`
      : filtros.desde
        ? `Desde ${fechaCorta(filtros.desde)}`
        : filtros.hasta
          ? `Hasta ${fechaCorta(filtros.hasta)}`
          : 'Fechas'

  return (
    <div
      className={cn(
        // Sangra hasta los bordes del `<main>` del layout (px-4 / md:px-8) y
        // se pega debajo de la topbar de 64px, que en mobile no existe.
        'sticky top-0 z-20 -mx-4 border-b border-hairline/70 bg-page/85 px-4 py-3 backdrop-blur-md',
        'md:top-16 md:-mx-8 md:px-8',
        'transition-opacity duration-200',
        pendiente && 'opacity-70',
      )}
    >
      {/* ── Mobile: búsqueda + chips de estado ─────────────────── */}
      <div className="md:hidden">
        <CampoBusqueda
          valor={texto}
          onChange={setTexto}
          onLimpiar={() => setTexto('')}
          alto="h-11"
        />

        <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar">
          <Chip
            activo={filtros.estados.length === 0}
            onClick={() => aplicar({ estados: [] })}
          >
            Todos
          </Chip>
          {ESTADOS.map((estado) => (
            <Chip
              key={estado}
              activo={filtros.estados.includes(estado)}
              onClick={() => alternarEstado(estado)}
            >
              {ETIQUETA_ESTADO[estado]}
            </Chip>
          ))}
        </div>
      </div>

      {/* ── Desktop: la barra completa ─────────────────────────── */}
      <div className="hidden items-center gap-2 md:flex md:flex-wrap">
        <div className="min-w-[240px] flex-1">
          <CampoBusqueda valor={texto} onChange={setTexto} onLimpiar={() => setTexto('')} />
        </div>

        {/* Estado: multi-select. */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="secondary" className={cn(filtros.estados.length > 0 && 'border-primary/40 bg-tint')}>
              {etiquetaEstados}
              <ChevronDown aria-hidden />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[260px]">
            <ul className="flex flex-col">
              {ESTADOS.map((estado) => {
                const activo = filtros.estados.includes(estado)
                return (
                  <li key={estado}>
                    <button
                      type="button"
                      onClick={() => alternarEstado(estado)}
                      className="flex w-full items-center gap-2.5 rounded-input px-2 py-1.5 text-left transition-colors hover:bg-tint"
                    >
                      <Check
                        aria-hidden
                        className={cn(
                          'size-4 shrink-0 text-primary',
                          activo ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                      <EstadoBadge estado={estado} size="sm" />
                    </button>
                  </li>
                )
              })}
            </ul>
            {filtros.estados.length > 0 && (
              <div className="mt-1 border-t border-hairline pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  full
                  onClick={() => aplicar({ estados: [] })}
                >
                  Ver todos los estados
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* Profesional. */}
        <Select
          value={filtros.profesional || TODOS}
          onValueChange={(v) => aplicar({ profesional: v === TODOS ? '' : v })}
        >
          <SelectTrigger
            aria-label="Filtrar por profesional"
            className={cn('w-[180px]', filtros.profesional && 'border-primary/40 bg-tint')}
          >
            <SelectValue placeholder="Profesional" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos los profesionales</SelectItem>
            {profesionales.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Obra social. */}
        <Select
          value={filtros.obraSocial || TODOS}
          onValueChange={(v) => aplicar({ obraSocial: v === TODOS ? '' : v })}
        >
          <SelectTrigger
            aria-label="Filtrar por obra social"
            className={cn('w-[180px]', filtros.obraSocial && 'border-primary/40 bg-tint')}
          >
            <SelectValue placeholder="Obra social" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todas las obras sociales</SelectItem>
            <SelectItem value={OBRA_SOCIAL_PARTICULAR}>Particular</SelectItem>
            {obrasSociales.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Rango de fechas de emisión. */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="secondary"
              className={cn((filtros.desde || filtros.hasta) && 'border-primary/40 bg-tint')}
            >
              <CalendarDays aria-hidden />
              {etiquetaFechas}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[280px] p-4">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="filtro-desde">Desde</Label>
                <Input
                  id="filtro-desde"
                  type="date"
                  value={filtros.desde}
                  max={filtros.hasta || undefined}
                  onChange={(e) => aplicar({ desde: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="filtro-hasta">Hasta</Label>
                <Input
                  id="filtro-hasta"
                  type="date"
                  value={filtros.hasta}
                  min={filtros.desde || undefined}
                  onChange={(e) => aplicar({ hasta: e.target.value })}
                />
              </div>
              {(filtros.desde || filtros.hasta) && (
                <PopoverClose asChild>
                  <Button variant="ghost" size="sm" onClick={() => aplicar({ desde: '', hasta: '' })}>
                    Quitar el rango
                  </Button>
                </PopoverClose>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {activos && (
          <Button
            variant="ghost"
            onClick={() => {
              setTexto('')
              enviado.current = ''
              iniciarTransicion(() => router.push(construirUrl(FILTROS_VACIOS), { scroll: false }))
            }}
          >
            <X aria-hidden />
            Limpiar {cantidad > 1 ? `(${cantidad})` : ''}
          </Button>
        )}

        <div className="ml-auto">
          <VistaToggle />
        </div>
      </div>
    </div>
  )
}

function CampoBusqueda({
  valor,
  onChange,
  onLimpiar,
  alto = 'h-9',
}: {
  valor: string
  onChange: (v: string) => void
  onLimpiar: () => void
  alto?: string
}) {
  return (
    <div className="relative">
      <Search
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint"
      />
      <Input
        type="search"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Buscar paciente, prestación o DNI"
        aria-label="Buscar paciente, prestación o DNI"
        className={cn(
          'pl-9 [&::-webkit-search-cancel-button]:appearance-none',
          valor && 'pr-9',
          alto,
        )}
      />
      {valor && (
        <button
          type="button"
          onClick={onLimpiar}
          aria-label="Limpiar la búsqueda"
          className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-pill text-faint transition-colors hover:bg-tint hover:text-ink"
        >
          <X aria-hidden className="size-4" />
        </button>
      )}
    </div>
  )
}

function Chip({
  activo,
  onClick,
  children,
}: {
  activo: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={cn(
        'inline-flex h-11 shrink-0 items-center rounded-pill border px-4 font-sans text-[13px] font-medium transition-colors',
        activo
          ? 'border-primary bg-primary text-white'
          : 'border-hairline bg-card text-muted hover:bg-tint hover:text-ink',
      )}
    >
      {children}
    </button>
  )
}

/**
 * Lista / Kanban. Sólo desktop: el kanban con drag & drop no tiene
 * sentido con el pulgar, así que en mobile ni se ofrece.
 */
function VistaToggle() {
  return (
    <div
      role="group"
      aria-label="Vista del listado"
      className="hidden items-center gap-1 rounded-pill border border-hairline bg-card p-1 md:inline-flex"
    >
      <span
        aria-current="page"
        className="inline-flex h-8 items-center gap-1.5 rounded-pill bg-primary px-3.5 font-sans text-[13px] font-medium text-white"
      >
        <List aria-hidden className="size-4" />
        Lista
      </span>
      <Link
        href="/pipeline"
        className="inline-flex h-8 items-center gap-1.5 rounded-pill px-3.5 font-sans text-[13px] font-medium text-muted transition-colors hover:bg-tint hover:text-ink"
      >
        <LayoutGrid aria-hidden className="size-4" />
        Kanban
      </Link>
    </div>
  )
}
