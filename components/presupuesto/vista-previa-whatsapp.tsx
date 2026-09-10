'use client'

import { FileText, Link2 } from 'lucide-react'

/**
 * Cómo le va a llegar el mensaje al paciente.
 *
 * El textarea muestra lo que se escribe, no lo que sale: el link
 * firmado del PDF se pega recién al enviar (`conLinkPdf`), y el
 * adjunto no aparece en ningún lado. Antes eso obligaba a mandarse el
 * presupuesto a uno mismo para saber qué recibía el paciente.
 *
 * Es una burbuja, no una captura de WhatsApp: no inventa tildes de
 * "entregado" ni horarios que todavía no existen.
 */
export function VistaPreviaWhatsApp({
  texto,
  archivo,
  peso,
  destinatario,
}: {
  /** El texto exacto que se manda, con el link ya pegado si corresponde. */
  texto: string
  /** Nombre del PDF que viaja adjunto, si es que viaja. */
  archivo?: string | null
  /** Tamaño del adjunto en bytes, para que no sea una promesa vaga. */
  peso?: number | null
  /** A quién le llega, tal como se va a ver arriba del chat. */
  destinatario: string
}) {
  return (
    <div className="rounded-card border border-hairline bg-page p-3">
      <p className="t-helper mb-2 flex items-center gap-1.5">
        <span className="inline-block size-1.5 rounded-full bg-primary" aria-hidden />
        Para {destinatario}
      </p>

      <div className="ml-auto w-fit max-w-[92%] rounded-[14px] rounded-br-[4px] border border-primary/15 bg-tint px-3.5 py-2.5">
        {archivo && (
          <div className="mb-2 flex items-center gap-2 rounded-input border border-primary/15 bg-card px-2.5 py-2">
            <FileText aria-hidden className="size-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="truncate font-sans text-[12.5px] font-medium text-ink">{archivo}</p>
              <p className="t-helper">PDF{peso ? ` · ${enKb(peso)}` : ''}</p>
            </div>
          </div>
        )}

        <p className="whitespace-pre-line break-words text-[13.5px] leading-relaxed text-ink">
          {texto}
        </p>
      </div>
    </div>
  )
}

/** Aviso de que al mensaje todavía le falta algo que se agrega al enviar. */
export function AvisoLinkPendiente() {
  return (
    <p className="t-helper mt-2 flex items-start gap-1.5">
      <Link2 aria-hidden className="mt-0.5 size-3.5 shrink-0 text-faint" />
      El link al PDF se agrega al final del mensaje cuando termine de prepararse.
    </p>
  )
}

function enKb(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}
