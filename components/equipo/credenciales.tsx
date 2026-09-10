'use client'

import { Check } from 'lucide-react'

import { CopiarBoton } from '@/components/ui'

/**
 * Lo que hay que pasarle a la persona, listo para copiar.
 *
 * Es la mitad que faltaba del alta: se creaba el usuario, el modal se
 * cerraba y la contraseña —que no se puede volver a ver— quedaba sólo
 * en la memoria de quien la tipeó. En el mostrador lo que pasa de
 * verdad es que se manda por WhatsApp, así que el botón grande copia
 * las dos líneas juntas y en el formato en que se mandan.
 */
export function PanelCredenciales({
  titulo,
  nombre,
  usuario,
  contrasena,
}: {
  titulo: string
  nombre: string
  usuario: string
  contrasena: string
}) {
  // Sin usuario resuelto (auth no contestó) se copia sólo la clave, en
  // vez de una línea «Usuario:» vacía que confunde a quien la recibe.
  const paraPasar = usuario
    ? `Smile Lab · Presupuestos\nUsuario: ${usuario}\nContraseña: ${contrasena}`
    : `Smile Lab · Presupuestos\nContraseña: ${contrasena}`

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3 rounded-card border border-primary/20 bg-tint p-4">
        <span
          aria-hidden
          className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-pill bg-primary text-white"
        >
          <Check className="size-4 stroke-[2.5]" />
        </span>
        <div className="min-w-0">
          <p className="font-sans text-[13.5px] font-semibold text-ink">{titulo}</p>
          <p className="t-helper">{nombre}</p>
        </div>
      </div>

      <dl className="overflow-hidden rounded-card border border-hairline">
        {usuario && <Renglon etiqueta="Usuario" valor={usuario} />}
        <Renglon etiqueta="Contraseña" valor={contrasena} ultimo />
      </dl>

      <CopiarBoton
        texto={paraPasar}
        etiqueta="Copiar usuario y contraseña"
        className="h-11 w-full justify-center bg-primary px-5 text-[13px] font-medium text-white shadow-cta hover:bg-primary-hover hover:text-white md:h-11"
      />

      <p className="t-helper">
        La contraseña no se guarda en claro: apenas cierres esta ventana no se puede volver a ver.
        Si se pierde, se pone una nueva desde acá.
      </p>
    </div>
  )
}

function Renglon({
  etiqueta,
  valor,
  ultimo,
}: {
  etiqueta: string
  valor: string
  ultimo?: boolean
}) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-2.5 ${ultimo ? '' : 'border-b border-hairline'}`}
    >
      <dt className="w-24 shrink-0 t-label">{etiqueta}</dt>
      <dd className="min-w-0 flex-1 break-all font-sans text-[14px] font-semibold tracking-[0.04em] text-ink tnum">
        {valor}
      </dd>
      <CopiarBoton texto={valor} etiqueta="Copiar" className="shrink-0" />
    </div>
  )
}
