'use client'

/**
 * Los ítems del presupuesto: tabla en desktop, card por ítem en mobile.
 *
 * Un ítem se puede editar a mano (monto y cobertura). Cuando eso pasa,
 * la fila queda **auditable**: teñida en warm, con chip «editado», con
 * el valor que dice el arancel a la vista y con "Restaurar valor del
 * arancel" a un tap. La idea es que dentro de tres meses se pueda
 * explicar por qué este presupuesto no coincide con la lista de precios.
 *
 * El override vive en el ítem: nunca escribe en `aranceles`.
 */

import { RotateCcw, Trash2 } from 'lucide-react'
import * as React from 'react'

import {
  Field,
  Input,
  InputMonto,
  MicroBadge,
  Monto,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabla,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Button,
} from '@/components/ui'
import { calcularItem, type CoberturaTipo } from '@/lib/calculo'
import { money, porcentaje as fmtPorcentaje } from '@/lib/formato'
import type { ItemBorrador } from '@/lib/types'
import { cn } from '@/lib/utils'

import { conCoberturaEditada, conMontoEditado, restaurarArancel } from './borrador'
import { InputPorcentaje } from './form-arancel'

/** "60 %", "$ 12.000", "que no cubre nada" — para el helper auditable. */
export function textoCobertura(tipo: CoberturaTipo, valor: number): string {
  if (tipo === 'porcentaje') return fmtPorcentaje(valor)
  if (tipo === 'monto') return money(valor)
  return 'que no cubre'
}

const TIPOS: { value: CoberturaTipo; label: string }[] = [
  { value: 'porcentaje', label: '% que cubre' },
  { value: 'monto', label: 'Monto fijo' },
  { value: 'ninguna', label: 'No cubre' },
]

interface PropsItem {
  item: ItemBorrador
  onCambiar: (item: ItemBorrador) => void
  onQuitar: () => void
}

/* ═══════════════════════════════════════════════════════════
   Controles compartidos
   ═══════════════════════════════════════════════════════════ */

function ControlesCobertura({ item, onCambiar, idBase }: PropsItem & { idBase: string }) {
  return (
    <div className="flex items-center gap-2">
      <Select
        value={item.cobertura_tipo}
        onValueChange={(v) => onCambiar(conCoberturaEditada(item, v as CoberturaTipo, 0))}
      >
        <SelectTrigger id={`${idBase}-tipo`} className="w-[132px]" aria-label="Tipo de cobertura">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TIPOS.map((t) => (
            <SelectItem key={t.value} value={t.value}>
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {item.cobertura_tipo === 'porcentaje' && (
        <div className="w-[86px]">
          <InputPorcentaje
            id={`${idBase}-valor`}
            value={item.cobertura_valor}
            onChange={(v) => onCambiar(conCoberturaEditada(item, 'porcentaje', v))}
          />
        </div>
      )}

      {item.cobertura_tipo === 'monto' && (
        <div className="w-[122px]">
          <InputMonto
            id={`${idBase}-valor`}
            value={item.cobertura_valor === 0 ? '' : item.cobertura_valor}
            onChange={(v) => onCambiar(conCoberturaEditada(item, 'monto', v))}
          />
        </div>
      )}
    </div>
  )
}

/**
 * Franja auditable: qué dice el arancel, por qué se cambió y el botón
 * para volver atrás. Aparece sólo si el ítem está editado.
 */
function FranjaOverride({ item, onCambiar, idBase }: PropsItem & { idBase: string }) {
  const dice: string[] = []
  if (item.monto_original !== null && item.monto !== item.monto_original) {
    dice.push(`monto ${money(item.monto_original)}`)
  }
  if (item.cobertura_original_tipo !== null) {
    dice.push(
      `cobertura ${textoCobertura(item.cobertura_original_tipo, item.cobertura_original_valor ?? 0)}`,
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-input border border-warm-line/25 bg-warm-soft p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] text-warm-ink">
          {dice.length > 0 ? (
            <>
              El arancel dice <strong className="font-semibold">{dice.join(' y ')}</strong>.
            </>
          ) : (
            'Este ítem se cargó a mano, sin arancel de referencia.'
          )}
        </p>
        <Button variant="warm" size="sm" onClick={() => onCambiar(restaurarArancel(item))}>
          <RotateCcw aria-hidden />
          Restaurar valor del arancel
        </Button>
      </div>

      <Field
        label="Motivo del cambio"
        htmlFor={`${idBase}-motivo`}
        helper="Opcional, interno. No sale en el PDF."
      >
        <Input
          id={`${idBase}-motivo`}
          value={item.motivo_override ?? ''}
          placeholder="Paciente derivado por un colega"
          onChange={(e) => onCambiar({ ...item, motivo_override: e.target.value || null })}
        />
      </Field>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   Desktop
   ═══════════════════════════════════════════════════════════ */

function FilaItem({ item, onCambiar, onQuitar }: PropsItem) {
  const { aCargo } = calcularItem(item.monto, item.cobertura_tipo, item.cobertura_valor)
  const idBase = `item-${item.key}`

  return (
    <>
      <Tr destacada={item.editado}>
        <Td className="align-top">
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-sans text-[14px] font-medium text-ink">{item.nombre}</span>
              {item.codigo && <MicroBadge>{item.codigo}</MicroBadge>}
              {item.editado && <MicroBadge tono="warm">editado</MicroBadge>}
            </div>
            <Input
              id={`${idBase}-detalle`}
              className="h-8 max-w-[320px] text-[13px]"
              value={item.detalle ?? ''}
              placeholder="Detalle: pieza 36, cara oclusal"
              aria-label={`Detalle de ${item.nombre}`}
              onChange={(e) => onCambiar({ ...item, detalle: e.target.value || null })}
            />
          </div>
        </Td>

        <Td className="align-top">
          <div className="w-[132px]">
            <InputMonto
              id={`${idBase}-monto`}
              aria-label={`Monto de ${item.nombre}`}
              value={item.monto === 0 ? '' : item.monto}
              onChange={(monto) => onCambiar(conMontoEditado(item, monto))}
            />
          </div>
        </Td>

        <Td className="align-top">
          <ControlesCobertura item={item} onCambiar={onCambiar} onQuitar={onQuitar} idBase={idBase} />
        </Td>

        <Td numerico className="align-top">
          <span className="inline-block pt-2">
            <Monto valor={aCargo} jerarquia="fuerte" />
          </span>
        </Td>

        <Td className="align-top">
          {/* Acción destructiva: nunca ícono solo. */}
          <Button variant="danger" size="sm" onClick={onQuitar}>
            <Trash2 aria-hidden />
            Quitar
          </Button>
        </Td>
      </Tr>

      {item.editado && (
        <Tr destacada>
          <Td colSpan={5} className="pt-0">
            <FranjaOverride item={item} onCambiar={onCambiar} onQuitar={onQuitar} idBase={idBase} />
          </Td>
        </Tr>
      )}
    </>
  )
}

/* ═══════════════════════════════════════════════════════════
   Mobile
   ═══════════════════════════════════════════════════════════ */

function CardItem({ item, onCambiar, onQuitar }: PropsItem) {
  const { aCargo } = calcularItem(item.monto, item.cobertura_tipo, item.cobertura_valor)
  const idBase = `item-${item.key}`

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-card border p-4',
        item.editado ? 'border-warm-line/25 bg-warm-faint' : 'border-hairline bg-card',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-sans text-[15px] font-medium text-ink">{item.nombre}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {item.codigo && <MicroBadge>{item.codigo}</MicroBadge>}
            {item.editado && <MicroBadge tono="warm">editado</MicroBadge>}
          </div>
        </div>
        <div className="text-right">
          <p className="t-label">A cargo</p>
          <Monto valor={aCargo} jerarquia="fuerte" className="text-[17px]" />
        </div>
      </div>

      <Field label="Detalle" htmlFor={`${idBase}-detalle-m`}>
        <Input
          id={`${idBase}-detalle-m`}
          className="h-11"
          value={item.detalle ?? ''}
          placeholder="Pieza 36, cara oclusal"
          onChange={(e) => onCambiar({ ...item, detalle: e.target.value || null })}
        />
      </Field>

      <Field label="Monto" htmlFor={`${idBase}-monto-m`}>
        <InputMonto
          id={`${idBase}-monto-m`}
          className="h-11"
          value={item.monto === 0 ? '' : item.monto}
          onChange={(monto) => onCambiar(conMontoEditado(item, monto))}
        />
      </Field>

      <Field label="Cobertura">
        <ControlesCobertura item={item} onCambiar={onCambiar} onQuitar={onQuitar} idBase={`${idBase}-m`} />
      </Field>

      {item.editado && (
        <FranjaOverride item={item} onCambiar={onCambiar} onQuitar={onQuitar} idBase={`${idBase}-m`} />
      )}

      <Button variant="danger" size="touch" full onClick={onQuitar}>
        <Trash2 aria-hidden />
        Quitar del presupuesto
      </Button>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   Lista
   ═══════════════════════════════════════════════════════════ */

export function ListaItems({
  items,
  esDesktop,
  onCambiar,
  onQuitar,
}: {
  items: ItemBorrador[]
  esDesktop: boolean
  onCambiar: (key: string, item: ItemBorrador) => void
  onQuitar: (key: string) => void
}) {
  if (items.length === 0) return null

  if (!esDesktop) {
    return (
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <CardItem
            key={item.key}
            item={item}
            onCambiar={(nuevo) => onCambiar(item.key, nuevo)}
            onQuitar={() => onQuitar(item.key)}
          />
        ))}
      </div>
    )
  }

  return (
    <Tabla>
      <Thead>
        <tr>
          <Th>Prestación</Th>
          <Th>Monto</Th>
          <Th>Cobertura</Th>
          <Th numerico>A cargo</Th>
          <Th>
            <span className="sr-only">Acciones</span>
          </Th>
        </tr>
      </Thead>
      <Tbody>
        {items.map((item) => (
          <FilaItem
            key={item.key}
            item={item}
            onCambiar={(nuevo) => onCambiar(item.key, nuevo)}
            onQuitar={() => onQuitar(item.key)}
          />
        ))}
      </Tbody>
    </Tabla>
  )
}
