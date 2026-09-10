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

import { Plus, RotateCcw, Trash2 } from 'lucide-react'
import * as React from 'react'

import { Button, Input, Monto } from '@/components/ui'
import { cuotasSuman100, repartirCuotas } from '@/lib/calculo'
import { porcentaje as fmtPorcentaje } from '@/lib/formato'
import type { CuotaBorrador } from '@/lib/types'

import { cuotaNueva } from './borrador'
import { InputPorcentaje } from './form-arancel'

/**
 * Nombre de arranque de una condición nueva.
 *
 * Antes nacían sin nombre, y una etiqueta vacía no la rechaza la
 * pantalla sino la base: se descubría al apretar "Guardar", con el
 * presupuesto entero cargado y un mensaje que no decía cuál de las
 * filas era. Arrancan con el nombre que el consultorio usa siempre y se
 * sobreescriben tipeando.
 */
function etiquetaSugerida(indice: number): string {
  if (indice === 0) return 'Al iniciar el tratamiento'
  if (indice === 1) return 'Al terminar el tratamiento'
  return `Pago ${indice + 1}`
}

export function EditorCuotas({
  cuotas,
  total,
  onChange,
  plantillaDe,
  onPlantilla,
  trayendoPlantilla,
}: {
  cuotas: CuotaBorrador[]
  /** Total a cargo del paciente: sobre esto se reparte. */
  total: number
  onChange: (cuotas: CuotaBorrador[]) => void
  /** Prestación principal de ahora: de ella sale la plantilla. */
  plantillaDe?: string | null
  onPlantilla?: () => void
  trayendoPlantilla?: boolean
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
          {/* Ancho completo en mobile: con `flex-1` y `min-w-0` en una
              fila de 390px, flexbox prefería encoger este campo a cero
              antes que cortar la línea. El input desaparecía y su
              etiqueta se imprimía encima de «Porcentaje». */}
          <div className="w-full min-w-0 sm:flex-1">
            <label className="t-label mb-1.5 block" htmlFor={`cuota-${cuota.key}`}>
              Cuándo
            </label>
            <Input
              id={`cuota-${cuota.key}`}
              value={cuota.etiqueta}
              placeholder="Al iniciar el tratamiento"
              // Vaciar la etiqueta a mano sí bloquea el guardado: se
              // marca acá, no al volver del servidor.
              invalido={!cuota.etiqueta.trim()}
              aria-label={`Cuándo se paga la condición ${i + 1}`}
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

          <div className="min-w-0 flex-1 text-right sm:w-[120px] sm:flex-none">
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
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              onChange([
                ...cuotas,
                cuotaNueva(
                  etiquetaSugerida(cuotas.length),
                  cierra ? 0 : Math.max(0, diferencia),
                ),
              ])
            }
          >
            <Plus aria-hidden />
            Agregar condición
          </Button>

          {/* Cambiar las prestaciones puede cambiar cuál es la
              principal: esto vuelve a traer sus condiciones sin tener
              que borrarlas una por una. */}
          {onPlantilla && plantillaDe && (
            <Button
              variant="ghost"
              size="sm"
              loading={trayendoPlantilla}
              onClick={onPlantilla}
            >
              <RotateCcw aria-hidden />
              <span className="max-w-[190px] truncate">Traer las de {plantillaDe}</span>
            </Button>
          )}
        </div>

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
