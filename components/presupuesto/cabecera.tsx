'use client'

import { Copy, FileText, GitBranch, MessageCircle, MoveRight } from 'lucide-react'
import Link from 'next/link'

import { Button, EstadoBadge, Kbd, Monto, TransicionPresupuesto } from '@/components/ui'
import { estaCerrado } from '@/lib/estados'
import { fechaLarga, matricula, vigenciaTexto } from '@/lib/formato'

import { useDetalle } from './contexto'
import type { CabeceraPresupuesto } from './tipos'

/**
 * Cabecera del documento: quién, con qué cobertura, desde cuándo y
 * hasta cuándo.
 *
 * En mobile el primer dato es el monto a cargo —es el número que el
 * paciente pregunta— y las acciones de seguimiento bajan a la barra
 * fija. Acá arriba quedan sólo PDF y Duplicar.
 *
 * En desktop no hay barra fija, así que las cuatro acciones viven acá.
 * «Enviar por WhatsApp» es la principal: antes sólo existía en la barra
 * de mobile y desde una computadora el sheet de envío era inalcanzable
 * salvo que se llegara con `?whatsapp=1` recién guardado.
 */
export function Cabecera({ cabecera }: { cabecera: CabeceraPresupuesto }) {
  const { estado, abrirEstado, abrirWhatsApp, duplicar, duplicando, cambiando } = useDetalle()
  const cerrado = estaCerrado(estado)

  const acciones = (
    <>
      <Button
        variant="primary"
        onClick={abrirWhatsApp}
        className="hidden md:inline-flex"
        title="Enviar por WhatsApp (W)"
      >
        <MessageCircle aria-hidden />
        Enviar por WhatsApp
        <Kbd className="ml-0.5">W</Kbd>
      </Button>

      <Button
        variant="secondary"
        onClick={abrirEstado}
        disabled={cambiando}
        className="hidden md:inline-flex"
        title="Cambiar estado (E)"
      >
        <MoveRight aria-hidden />
        Cambiar estado
        <Kbd className="ml-0.5">E</Kbd>
      </Button>

      <Button asChild variant="secondary" title="Abrir el PDF (P)">
        <a
          href={`/api/presupuestos/${cabecera.id}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <FileText aria-hidden />
          PDF
          <Kbd className="ml-0.5">P</Kbd>
        </a>
      </Button>

      <Button variant="secondary" onClick={duplicar} loading={duplicando}>
        <Copy aria-hidden />
        Duplicar
      </Button>
    </>
  )

  return (
    /* La otra mitad del morph: la fila o la card que se tocó en el
       listado se transforma en esta cabecera. Sin este lado el nombre
       no tenía par y la navegación era un corte seco. */
    <TransicionPresupuesto id={cabecera.id} variante="detalle">
      <header className="surface animate-enter p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="t-h2">Presupuesto {cabecera.numero}</h1>
              {/* El badge sale del contexto, no de la fila del servidor:
                  así cambia en el mismo frame en que se toca el estado. */}
              <EstadoBadge estado={estado} />
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

          <div className="no-print flex shrink-0 flex-wrap items-center gap-2">{acciones}</div>
        </div>

        {/* Número héroe de mobile: en desktop el monto vive en el bloque
            de totales, debajo de la tabla. */}
        <div className="cabecera-hero mt-5 rounded-card bg-tint px-4 py-3.5 md:hidden">
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
              // El afiliado se muestra sólo si HAY obra social. Sin ella
              // el número no significa nada —pertenece a otra cobertura,
              // la que el paciente tiene en la ficha— y quedaba
              // «Particular · Afiliado AP-884120», que se lee como que
              // el presupuesto sí tiene cobertura. El PDF y la vista
              // previa del wizard ya lo hacían bien, con un comentario
              // que lo dice: «Sin obra social no hay afiliado que
              // mostrar».
              !cabecera.obra_social_nombre
                ? 'Sin cobertura'
                : cabecera.paciente_afiliado
                  ? `Afiliado ${cabecera.paciente_afiliado}`
                  : 'Sin número de afiliado'
            }
          />
          <Dato
            etiqueta="Profesional"
            valor={cabecera.profesional_nombre}
            extra={matricula(cabecera.profesional_matricula)}
          />
          <Dato
            etiqueta="Válido hasta"
            valor={fechaLarga(cabecera.valido_hasta)}
            extra={vigenciaTexto(cabecera.valido_hasta)}
          />
        </dl>
      </header>
    </TransicionPresupuesto>
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
