'use client'

import { X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import * as React from 'react'

import { OBRA_SOCIAL_PARTICULAR, type FiltrosHome } from '@/components/home/tipos'
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
import { cn } from '@/lib/utils'

import { hayFiltros, urlPipeline, type OpcionFiltro } from './tipos'

/** Sentinela de los `Select`: Radix no acepta `value=""`. */
const TODOS = 'todos'

/**
 * Filtros del tablero. Son **los mismos de la home** y viajan en la URL
 * con las mismas claves (`prof`, `os`, `desde`, `hasta`, `q`), así el
 * toggle Lista ⇄ Kanban conserva el contexto.
 *
 * No hay filtro de estado: las columnas ya son eso.
 */
export function FiltrosPipeline({
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

  const aplicar = React.useCallback(
    (parcial: Partial<FiltrosHome>) => {
      iniciarTransicion(() => {
        router.push(urlPipeline({ ...filtros, ...parcial }), { scroll: false })
      })
    },
    [filtros, router],
  )

  const activos = hayFiltros(filtros)

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 transition-opacity duration-200',
        pendiente && 'opacity-60',
      )}
    >
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

      <Select
        value={filtros.obraSocial || TODOS}
        onValueChange={(v) => aplicar({ obraSocial: v === TODOS ? '' : v })}
      >
        <SelectTrigger
          aria-label="Filtrar por obra social"
          className={cn('w-[190px]', filtros.obraSocial && 'border-primary/40 bg-tint')}
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

      {/* Rango de emisión. Se aplica al soltar el campo, no a cada tecla. */}
      <div className="flex items-center gap-1.5 rounded-input border border-hairline bg-card px-2.5 py-1">
        <span className="t-label text-[9.5px] tracking-[0.12em] text-muted">Emitido</span>
        <Input
          type="date"
          aria-label="Emitido desde"
          value={filtros.desde}
          max={filtros.hasta || undefined}
          onChange={(e) => aplicar({ desde: e.target.value })}
          className="h-7 w-[132px] border-0 px-1 text-[13px] focus:ring-0"
        />
        <span aria-hidden className="text-faint">
          –
        </span>
        <Input
          type="date"
          aria-label="Emitido hasta"
          value={filtros.hasta}
          min={filtros.desde || undefined}
          onChange={(e) => aplicar({ hasta: e.target.value })}
          className="h-7 w-[132px] border-0 px-1 text-[13px] focus:ring-0"
        />
      </div>

      {/* La búsqueda se escribe en Home; acá se muestra para que el tablero
          no aparezca filtrado sin decir por qué, y se puede sacar. */}
      {filtros.q && (
        <button
          type="button"
          onClick={() => aplicar({ q: '' })}
          className="inline-flex h-9 items-center gap-1.5 rounded-pill border border-primary/25 bg-tint px-3 font-sans text-[13px] text-primary-hover transition-colors hover:bg-primary/15"
        >
          Búsqueda: «{filtros.q}»
          <X aria-hidden className="size-3.5" />
        </button>
      )}

      {activos && (
        <Button
          variant="ghost"
          onClick={() => iniciarTransicion(() => router.push('/pipeline', { scroll: false }))}
        >
          Limpiar filtros
        </Button>
      )}
    </div>
  )
}
