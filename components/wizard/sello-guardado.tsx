'use client'

/**
 * "Guardado 14:32" en la barra de pasos.
 *
 * Antes vivía sólo en el paso 1, que es justo donde menos falta hace: lo
 * que da miedo perder son las diez prestaciones del paso 2 y la
 * observación a medio escribir del 3. Ahora acompaña a los tres pasos.
 *
 * Es deliberadamente callado: texto chico, sin color de alarma, sin
 * animación de entrada. Un indicador de autoguardado que parpadea roba
 * la atención cada vez que alguien tipea una letra.
 *
 * Accesibilidad: el sello visible no es una región viva —anunciar
 * "guardado" cada 800 ms sería insoportable con lector de pantalla—;
 * se anuncia una sola vez, cuando el borrador queda guardado por
 * primera vez.
 *
 * Cómo se consigue ese "una sola vez" sin estado: la región viva está
 * SIEMPRE montada y su texto pasa de vacío a la frase cuando llega el
 * primer sello. Un `aria-live` anuncia cuando su contenido cambia, y
 * este texto no vuelve a cambiar por más que la hora se actualice. La
 * versión anterior montaba la región junto con su contenido y la
 * desmontaba en un efecto: además de encadenar un render, montar una
 * región viva ya llena es justo el caso que los lectores de pantalla
 * no anuncian de forma confiable.
 */

import { Check } from 'lucide-react'

import { hora } from '@/lib/formato'

export function SelloGuardado({ guardadoEn }: { guardadoEn: string | null }) {
  return (
    <>
      {guardadoEn && (
        <p
          className="flex shrink-0 items-center gap-1 font-sans text-[11.5px] text-faint"
          title="El borrador queda en este dispositivo hasta que lo emitas."
        >
          <Check className="size-3 text-primary" aria-hidden />
          <span className="tabular-nums">Guardado {hora(guardadoEn)}</span>
        </p>
      )}

      <span role="status" className="sr-only">
        {guardadoEn ? 'El borrador quedó guardado en este dispositivo.' : ''}
      </span>
    </>
  )
}
