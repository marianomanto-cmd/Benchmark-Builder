'use client'

/**
 * Paso 3 · Cerrar.
 *
 * Observaciones, condiciones de pago, estado inicial y nota interna,
 * con la maqueta del documento al lado (abajo y colapsada en mobile).
 * Ver el documento mientras se escribe es lo que evita el clásico
 * "guardé y salió con una observación a medio escribir".
 */

import { Lock } from 'lucide-react'
import * as React from 'react'

import { Field, Segmented, Textarea } from '@/components/ui'
import { calcularTotales } from '@/lib/calculo'
import type { BorradorPresupuesto, CuotaBorrador, Paciente } from '@/lib/types'

import { CUOTA_UNICA, cuotaNueva, itemPrincipal } from './borrador'
import { buscarCuotasPlantilla } from './consultas'
import { EditorCuotas } from './cuotas'
import { PreviewPdf, PreviewPdfColapsable } from './preview-pdf'

type EstadoInicial = BorradorPresupuesto['estado_inicial']

export function PasoCerrar({
  borrador,
  paciente,
  parche,
  setCuotas,
  esDesktop,
}: {
  borrador: BorradorPresupuesto
  paciente: Paciente | null
  parche: (cambios: Partial<BorradorPresupuesto>) => void
  setCuotas: (cuotas: CuotaBorrador[]) => void
  esDesktop: boolean
}) {
  const totales = calcularTotales(borrador.items)

  // Las condiciones se heredan una sola vez: si alguien las borró todas
  // a propósito, no se las volvemos a poner al pasar de paso.
  //
  // La marca vive en el borrador y no en un `useRef`: este paso se
  // desmonta al volver al 2, así que un ref se reiniciaba y la
  // plantilla reaparecía en cuanto se volvía al paso 3.
  React.useEffect(() => {
    if (borrador.cuotas_heredadas || borrador.cuotas.length > 0) return
    const principal = itemPrincipal(borrador.items)
    if (!principal) return

    parche({ cuotas_heredadas: true })
    let vigente = true

    async function heredar(prestacionId: string | null) {
      const plantilla = prestacionId ? await buscarCuotasPlantilla(prestacionId) : []
      if (!vigente) return
      setCuotas(
        plantilla.length > 0
          ? plantilla.map((c) => cuotaNueva(c.etiqueta, c.porcentaje))
          : // Sin plantilla, la condición honesta es una sola: se paga todo.
            [cuotaNueva(CUOTA_UNICA, 100)],
      )
    }

    void heredar(principal.prestacion_id).catch(() => {
      if (vigente) setCuotas([cuotaNueva(CUOTA_UNICA, 100)])
    })

    return () => {
      vigente = false
    }
  }, [borrador.cuotas_heredadas, borrador.cuotas.length, borrador.items, setCuotas, parche])

  const formulario = (
    <div className="flex flex-col gap-5">
      <Field
        label="Observaciones para el paciente"
        htmlFor="w3-obs"
        helper="Salen impresas en el presupuesto, debajo del detalle."
      >
        <Textarea
          id="w3-obs"
          value={borrador.observaciones}
          placeholder="Incluye dos controles posteriores sin cargo. La cobertura se confirma con la autorización de la obra social."
          onChange={(e) => parche({ observaciones: e.target.value })}
        />
      </Field>

      <div>
        <p className="t-label mb-2">Condiciones de pago</p>
        <p className="t-helper mb-3">
          Vienen de{' '}
          <strong className="font-semibold text-ink">
            {itemPrincipal(borrador.items)?.nombre ?? 'la prestación principal'}
          </strong>
          . Editalas para este presupuesto: tienen que sumar 100 %.
        </p>
        <EditorCuotas cuotas={borrador.cuotas} total={totales.aCargo} onChange={setCuotas} />
      </div>

      <Field
        label="Estado inicial"
        helper={
          borrador.estado_inicial === 'enviado'
            ? 'Al guardar se abre el WhatsApp con el mensaje listo.'
            : 'Queda cargado en el consultorio. Lo mandás cuando quieras.'
        }
      >
        <Segmented<EstadoInicial>
          value={borrador.estado_inicial}
          opciones={[
            { value: 'realizado', label: 'Realizado' },
            { value: 'enviado', label: 'Enviado' },
          ]}
          onChange={(estado_inicial) => parche({ estado_inicial })}
        />
      </Field>

      <Field
        label="Nota interna"
        htmlFor="w3-nota"
        helper={
          <span className="inline-flex items-center gap-1.5">
            <Lock className="size-3.5" aria-hidden />
            No sale en el PDF ni en el WhatsApp. Es sólo para el equipo.
          </span>
        }
      >
        <Textarea
          id="w3-nota"
          className="min-h-[64px]"
          value={borrador.nota_interna}
          placeholder="Llamó la mamá, quiere arrancar en marzo."
          onChange={(e) => parche({ nota_interna: e.target.value })}
        />
      </Field>
    </div>
  )

  if (!esDesktop) {
    return (
      <div className="flex flex-col gap-5">
        {formulario}
        <PreviewPdfColapsable borrador={borrador} paciente={paciente} />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_320px] gap-6">
      {formulario}
      <div className="sticky top-0 self-start">
        <PreviewPdf borrador={borrador} paciente={paciente} />
      </div>
    </div>
  )
}
