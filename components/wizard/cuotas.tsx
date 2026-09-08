'use client'

/**
 * Condiciones de pago.
 *
 * Se heredan de la plantilla de la prestación de mayor monto y se
 * editan acá. El porcentaje es el que manda; los pesos se muestran
 * repartidos con `repartirCuotas`, que hace lo mismo que la base al
 * guardar (la última cuota absorbe el redondeo) para que el preview no
 * mienta un peso.
 */

import { Plus, Trash2 } from 'lucide-react'
import * as React from 'react'

import { Button, Input, Monto } from '@/components/ui'
import { cuotasSuman100, repartirCuotas } from '@/lib/calculo'
import { porcentaje as fmtPorcentaje } from '@/lib/formato'
import type { CuotaBorrador } from '@/lib/types'

import { cuotaNueva } from './borrador'
import { InputPorcentaje } from './form-arancel'

export function EditorCuotas({
  cuotas,
  total,
  onChange,
}: {
  cuotas: CuotaBorrador[]
  /** Total a cargo del paciente: sobre esto se reparte. */
  total: number
  onChange: (cuotas: CuotaBorrador[]) => void
}) {
  const montos = repartirCuotas(
    total,
    cuotas.map((c) => c.porcentaje),
  )
  const suma = cuotas.reduce((a, c) => a + c.porcentaje, 0)
  const cierra = cuotasSuman100(cuotas.map((c) => c.porcentaje))
  const diferencia = Math.round((100 - suma) * 100) / 100

  function cambiar(key: string, cambios: Partial<CuotaBorrador>) {
    onChange(cuotas.map((c) => (c.key === key ? { ...c, ...cambios } : c)))
  }

  /** Manda el reparto al 100 % ajustando la última fila. */
  function ajustarUltima() {
    if (cuotas.length === 0) return
    const ultima = cuotas[cuotas.length - 1]
    const resto = Math.round((ultima.porcentaje + diferencia) * 100) / 100
    cambiar(ultima.key, { porcentaje: Math.max(0, resto) })
  }

  return (
    <div className="flex flex-col gap-3">
      {cuotas.length === 0 && (
        <p className="t-helper">
          Sin condiciones de pago: el presupuesto muestra sólo el total a cargo.
        </p>
      )}

      {cuotas.map((cuota, i) => (
        <div
          key={cuota.key}
          className="flex flex-wrap items-end gap-2 rounded-input border border-hairline bg-card p-3 sm:flex-nowrap"
        >
          <div className="min-w-0 flex-1">
            <label className="t-label mb-1.5 block" htmlFor={`cuota-${cuota.key}`}>
              Cuándo
            </label>
            <Input
              id={`cuota-${cuota.key}`}
              value={cuota.etiqueta}
              placeholder="Al iniciar el tratamiento"
              onChange={(e) => cambiar(cuota.key, { etiqueta: e.target.value })}
            />
          </div>

          <div className="w-[92px] shrink-0">
            <label className="t-label mb-1.5 block" htmlFor={`cuota-${cuota.key}-pct`}>
              Porcentaje
            </label>
            <InputPorcentaje
              id={`cuota-${cuota.key}-pct`}
              value={cuota.porcentaje}
              onChange={(porcentaje) => cambiar(cuota.key, { porcentaje })}
            />
          </div>

          <div className="w-[120px] shrink-0 text-right">
            <p className="t-label mb-1.5">Son</p>
            <p className="flex h-9 items-center justify-end">
              <Monto valor={montos[i] ?? 0} jerarquia="fuerte" />
            </p>
          </div>

          <Button
            variant="danger"
            size="sm"
            className="shrink-0"
            onClick={() => onChange(cuotas.filter((c) => c.key !== cuota.key))}
          >
            <Trash2 aria-hidden />
            Quitar
          </Button>
        </div>
      ))}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onChange([...cuotas, cuotaNueva('', cierra ? 0 : Math.max(0, diferencia))])}
        >
          <Plus aria-hidden />
          Agregar condición
        </Button>

        {cuotas.length > 0 &&
          (cierra ? (
            <p className="t-helper">Las condiciones suman 100 %.</p>
          ) : (
            <p className="t-helper flex flex-wrap items-center gap-2 text-warm-ink">
              <span>
                {diferencia > 0
                  ? `Falta repartir ${fmtPorcentaje(diferencia)}.`
                  : `Te pasaste ${fmtPorcentaje(Math.abs(diferencia))}.`}
              </span>
              <Button variant="link" onClick={ajustarUltima}>
                Ajustar la última para que cierre
              </Button>
            </p>
          ))}
      </div>
    </div>
  )
}
