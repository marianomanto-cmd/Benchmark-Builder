'use client'

import { Copy, FileText, GitBranch, MoveRight } from 'lucide-react'
import Link from 'next/link'

import { Button, EstadoBadge, Monto } from '@/components/ui'
import { estaCerrado } from '@/lib/estados'
import { fechaLarga, vigenciaTexto } from '@/lib/formato'

import { useDetalle } from './contexto'
import type { CabeceraPresupuesto } from './tipos'

/**
 * Cabecera del documento: quién, con qué cobertura, desde cuándo y
 * hasta cuándo.
 *
 * En mobile el primer dato es el monto a cargo —es el número que el
 * paciente pregunta— y las acciones de seguimiento bajan a la barra
 * fija. Acá arriba quedan sólo PDF y Duplicar.
 */
export function Cabecera({ cabecera }: { cabecera: CabeceraPresupuesto }) {
  const { abrirEstado, duplicar, duplicando, cambiando } = useDetalle()
  const cerrado = estaCerrado(cabecera.estado)

  const acciones = (
    <>
      <Button asChild variant="secondary">
        <a
          href={`/api/presupuestos/${cabecera.id}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <FileText aria-hidden />
          PDF
        </a>
      </Button>

      <Button variant="secondary" onClick={duplicar} loading={duplicando}>
        <Copy aria-hidden />
        Duplicar
      </Button>

      <Button
        variant="primary"
        onClick={abrirEstado}
        disabled={cambiando}
        className="hidden md:inline-flex"
      >
        <MoveRight aria-hidden />
        Cambiar estado
      </Button>
    </>
  )

  return (
    <header className="surface animate-enter p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="t-h2">Presupuesto {cabecera.numero}</h1>
            <EstadoBadge estado={cabecera.estado} />
          </div>
          <p className="t-helper mt-1">
            Emitido el {fechaLarga(cabecera.fecha_emision)} · {vigenciaTexto(cabecera.valido_hasta)}
          </p>
          {cabecera.duplicado_de && (
            <p className="t-helper mt-1.5 flex items-center gap-1.5">
              <GitBranch aria-hidden className="size-3.5 text-faint" />
              <Link
                href={`/presupuestos/${cabecera.duplicado_de}`}
                className="text-primary underline-offset-4 hover:underline"
              >
                Viene de otro presupuesto
              </Link>
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">{acciones}</div>
      </div>

      {/* Número héroe de mobile: en desktop el monto vive en el bloque
          de totales, debajo de la tabla. */}
      <div className="mt-5 rounded-card bg-tint px-4 py-3.5 md:hidden">
        <p className="t-label">A cargo del paciente</p>
        <Monto
          valor={cabecera.total_a_cargo}
          jerarquia={cerrado ? 'apagado' : 'hero'}
          className="mt-0.5 block"
        />
        {cerrado && (
          <p className="t-helper mt-1">Este presupuesto ya no está en juego.</p>
        )}
      </div>

      <dl className="mt-5 grid gap-x-6 gap-y-4 border-t border-hairline pt-5 sm:grid-cols-2 lg:grid-cols-4">
        <Dato
          etiqueta="Paciente"
          valor={cabecera.paciente_nombre}
          extra={cabecera.paciente_dni ? `DNI ${cabecera.paciente_dni}` : null}
        />
        <Dato
          etiqueta="Obra social"
          valor={cabecera.obra_social_nombre ?? 'Particular'}
          extra={
            cabecera.paciente_afiliado
              ? `Afiliado ${cabecera.paciente_afiliado}`
              : cabecera.obra_social_nombre
                ? 'Sin número de afiliado'
                : 'Sin cobertura'
          }
        />
        <Dato
          etiqueta="Profesional"
          valor={cabecera.profesional_nombre}
          extra={cabecera.profesional_matricula ? `MP ${cabecera.profesional_matricula}` : null}
        />
        <Dato
          etiqueta="Válido hasta"
          valor={fechaLarga(cabecera.valido_hasta)}
          extra={vigenciaTexto(cabecera.valido_hasta)}
        />
      </dl>
    </header>
  )
}

function Dato({
  etiqueta,
  valor,
  extra,
}: {
  etiqueta: string
  valor: string
  extra?: string | null
}) {
  return (
    <div className="min-w-0">
      <dt className="t-label">{etiqueta}</dt>
      <dd className="mt-1 text-[14px] font-medium text-ink break-words">{valor}</dd>
      {extra && <dd className="t-helper">{extra}</dd>}
    </div>
  )
}
