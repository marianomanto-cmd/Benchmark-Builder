'use client'

import { X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import * as React from 'react'

import { OBRA_SOCIAL_PARTICULAR, type FiltrosHome } from '@/components/home/tipos'
import {
  Button,
  Input,
  Kbd,
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
 * Cuánto se espera antes de aplicar un rango de fechas.
 *
 * BUG QUE ARREGLA: los dos `<input type="date">` aplicaban en cada
 * `onChange`. React mapea ese evento al `input` del DOM, y el navegador
 * lo dispara por CADA dígito tecleado dentro de un segmento: corregir
 * el año de un rango ya cargado disparaba `0002-…`, `0020-…`, `0202-…`
 * y recién después `2026-…`. Eran cuatro `router.push`, cuatro consultas
 * al servidor y un tablero que se vaciaba tres veces antes de mostrar lo
 * que se pidió. El comentario prometía «se aplica al soltar el campo»;
 * ahora es verdad.
 */
const ESPERA_FECHA = 500

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
      aria-busy={pendiente}
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
        <CampoFecha
          etiqueta="Emitido desde"
          valor={filtros.desde}
          max={filtros.hasta || undefined}
          onAplicar={(desde) => aplicar({ desde })}
        />
        <span aria-hidden className="text-faint">
          –
        </span>
        <CampoFecha
          etiqueta="Emitido hasta"
          valor={filtros.hasta}
          min={filtros.desde || undefined}
          onAplicar={(hasta) => aplicar({ hasta })}
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

      {/* El tablero se maneja sin mouse, pero eso no se descubre solo. */}
      <p className="ml-auto hidden items-center gap-1.5 whitespace-nowrap font-sans text-[12px] text-faint lg:flex">
        Sin mouse: <Kbd>Tab</Kbd> hasta la tarjeta, <Kbd>Espacio</Kbd> y flechas
      </p>
    </div>
  )
}

/**
 * Un campo de fecha que aplica cuando el rango terminó de escribirse:
 * al salir del campo, con Enter, o medio segundo después de la última
 * tecla. Ver `ESPERA_FECHA`.
 */
function CampoFecha({
  etiqueta,
  valor,
  min,
  max,
  onAplicar,
}: {
  etiqueta: string
  valor: string
  min?: string
  max?: string
  onAplicar: (valor: string) => void
}) {
  const [local, setLocal] = React.useState(valor)
  const temporizador = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  // El servidor es la fuente de verdad: si el filtro cambió desde
  // afuera (atrás del navegador, «Limpiar filtros»), el campo lo sigue.
  const [ultimo, setUltimo] = React.useState(valor)
  if (valor !== ultimo) {
    setUltimo(valor)
    setLocal(valor)
  }

  const cancelar = () => {
    if (temporizador.current) clearTimeout(temporizador.current)
    temporizador.current = null
  }

  // Salir de la pantalla con un cambio a medio escribir no tiene que
  // disparar una navegación cuando el componente ya no está.
  React.useEffect(
    () => () => {
      if (temporizador.current) clearTimeout(temporizador.current)
    },
    [],
  )

  const aplicarYa = (siguiente: string) => {
    cancelar()
    if (siguiente !== valor) onAplicar(siguiente)
  }

  return (
    <Input
      type="date"
      aria-label={etiqueta}
      value={local}
      min={min}
      max={max}
      onChange={(e) => {
        const siguiente = e.target.value
        setLocal(siguiente)
        cancelar()
        temporizador.current = setTimeout(() => aplicarYa(siguiente), ESPERA_FECHA)
      }}
      onBlur={() => aplicarYa(local)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') aplicarYa(local)
      }}
      className="h-7 w-[132px] border-0 px-1 text-[13px] focus:ring-0"
    />
  )
}
