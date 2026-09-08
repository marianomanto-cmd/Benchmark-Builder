'use client'

import { Copy, TrendingDown, TrendingUp } from 'lucide-react'

import { Banner, Button, Monto } from '@/components/ui'
import { fechaLarga, money, vigenciaTexto } from '@/lib/formato'

import { useDetalle } from './contexto'
import type { ComparacionPrecio } from './tipos'

/**
 * Banner de precio desactualizado.
 *
 * LA REGLA: el presupuesto emitido es un documento. Los aranceles se
 * movieron, pero este papel sigue valiendo lo que dice hasta que se
 * vence. Por eso el banner **informa** y la única salida es emitir uno
 * nuevo: no existe "actualizar precios de este presupuesto", y no hay
 * que agregarlo. Un presupuesto que se reescribe solo es un presupuesto
 * que el consultorio no puede defender frente al paciente.
 */
export function BannerPrecio({
  comparacion,
  validoHasta,
  fechaEmision,
}: {
  comparacion: ComparacionPrecio
  validoHasta: string
  fechaEmision: string
}) {
  const { duplicar, duplicando } = useDetalle()
  const subio = comparacion.diferencia > 0
  const Icono = subio ? TrendingUp : TrendingDown

  return (
    <Banner
      className="animate-enter"
      tono="warm"
      icono={<Icono className="size-5" />}
      titulo={
        subio
          ? 'Los aranceles subieron desde que se emitió este presupuesto'
          : 'Los aranceles bajaron desde que se emitió este presupuesto'
      }
      acciones={
        <Button variant="warm" onClick={duplicar} loading={duplicando}>
          <Copy aria-hidden />
          Duplicar con valores de hoy
        </Button>
      }
    >
      <p>
        Con los aranceles vigentes hoy, las mismas prestaciones quedarían en{' '}
        <Monto valor={comparacion.aCargoHoy} className="font-semibold text-warm-ink" /> a cargo del
        paciente: {money(Math.abs(comparacion.diferencia))} {subio ? 'más' : 'menos'} que este
        documento.
      </p>
      <p className="mt-1.5">
        <strong>Este presupuesto mantiene sus valores</strong> —los que se congelaron el{' '}
        {fechaLarga(fechaEmision)}— y sirve hasta el {fechaLarga(validoHasta)} (
        {vigenciaTexto(validoHasta)}). Si el paciente quiere los números de hoy, se emite uno
        nuevo: el original queda intacto en el historial.
      </p>
    </Banner>
  )
}
