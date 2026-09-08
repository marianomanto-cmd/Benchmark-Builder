'use client'

import { FileText, MessageCircle } from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'

import { Button, Tooltip } from '@/components/ui'
import { telefonoWhatsApp } from '@/lib/formato'

/**
 * Las dos acciones que el consultorio hace todo el día sobre un
 * presupuesto: bajar el PDF y mandarlo por WhatsApp.
 *
 * WhatsApp navega al detalle con `?whatsapp=1` en vez de montar el
 * sheet acá. Es a propósito: el sheet necesita los ítems y el teléfono
 * completos, que el listado no trae, y así la home no queda acoplada a
 * un componente de otra pantalla.
 *
 * En mobile son dos targets de 44px con texto, sin menú intermedio:
 * mandar el presupuesto es la acción principal, no una opción escondida.
 */
export function AccionesFila({
  presupuestoId,
  numero,
  telefono,
  variante,
}: {
  presupuestoId: string
  numero: string
  telefono: string | null
  variante: 'tabla' | 'card'
}) {
  const hayWhatsApp = telefonoWhatsApp(telefono) !== null
  const hrefPdf = `/api/presupuestos/${presupuestoId}/pdf`
  const hrefWhatsApp = `/presupuestos/${presupuestoId}?whatsapp=1`

  // La fila y la card son clickeables: el click en una acción no tiene
  // que arrastrar al detalle.
  const frenar = (e: React.MouseEvent) => e.stopPropagation()

  if (variante === 'card') {
    // Dos targets de 44px, uno al lado del otro: sin menú intermedio.
    // Sin texto porque en la card compiten con el número héroe "a cargo";
    // el nombre de la acción viaja en `aria-label` para lectores de pantalla.
    return (
      <div className="flex items-center gap-2" onClick={frenar}>
        <Button asChild variant="secondary" size="icon-touch">
          <a
            href={hrefPdf}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Abrir el PDF del presupuesto ${numero}`}
          >
            <FileText aria-hidden />
          </a>
        </Button>

        {hayWhatsApp ? (
          <Button asChild variant="secondary" size="icon-touch">
            <Link href={hrefWhatsApp} aria-label={`Enviar el presupuesto ${numero} por WhatsApp`}>
              <MessageCircle aria-hidden />
            </Link>
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="icon-touch"
            disabled
            aria-label="El paciente no tiene teléfono cargado: no se puede enviar por WhatsApp"
          >
            <MessageCircle aria-hidden />
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center justify-end gap-1" onClick={frenar}>
      <Tooltip contenido="Abrir el PDF">
        <Button asChild variant="ghost" size="icon">
          <a
            href={hrefPdf}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Abrir el PDF del presupuesto ${numero}`}
          >
            <FileText aria-hidden />
          </a>
        </Button>
      </Tooltip>

      {hayWhatsApp ? (
        <Tooltip contenido="Enviar por WhatsApp">
          <Button asChild variant="ghost" size="icon">
            <Link href={hrefWhatsApp} aria-label={`Enviar el presupuesto ${numero} por WhatsApp`}>
              <MessageCircle aria-hidden />
            </Link>
          </Button>
        </Tooltip>
      ) : (
        <Tooltip contenido="El paciente no tiene teléfono cargado">
          <span className="inline-flex">
            <Button
              variant="ghost"
              size="icon"
              disabled
              aria-label="El paciente no tiene teléfono cargado"
            >
              <MessageCircle aria-hidden />
            </Button>
          </span>
        </Tooltip>
      )}
    </div>
  )
}
