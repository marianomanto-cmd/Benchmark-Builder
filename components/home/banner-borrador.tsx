'use client'

import { FileClock } from 'lucide-react'
import { toast } from 'sonner'

import { Banner, Button } from '@/components/ui'
import { useWizard } from '@/components/wizard/use-wizard'
import { borrarBorrador, useBorradorGuardado } from '@/lib/draft'
import { fechaHora, hora, isoDate } from '@/lib/formato'

const NOMBRE_PASO: Record<1 | 2 | 3, string> = {
  1: 'Paciente y cobertura',
  2: 'Prestaciones',
  3: 'Condiciones de pago',
}

/**
 * Alguien empezó un presupuesto y no lo terminó.
 *
 * Se muestra arriba de todo con la hora exacta del autoguardado: sin
 * esa referencia nadie sabe si el borrador es de hace cinco minutos o
 * de la semana pasada, y por las dudas no lo toca.
 *
 * La lectura y la validación viven en `lib/draft.ts`, que es también
 * quien escribe desde el wizard: una sola definición de qué es un
 * borrador válido, en lugar de dos que se pueden desincronizar.
 */
export function BannerBorrador() {
  const { abrir } = useWizard()
  const borrador = useBorradorGuardado()

  if (!borrador) return null

  const paciente = borrador.paciente_nombre?.trim()
  const guardado = borrador.guardado_en
  const esDeHoy = guardado.slice(0, 10) === isoDate()

  let momento: string
  try {
    momento = esDeHoy ? `hoy a las ${hora(guardado)}` : `el ${fechaHora(guardado)}`
  } catch {
    // Sello corrupto: el banner sigue sirviendo aunque la hora no.
    momento = 'hace un rato'
  }

  function descartar() {
    // `borrarBorrador` avisa del cambio: el hook saca el banner solo.
    borrarBorrador()
    toast.success('Borrador descartado')
  }

  return (
    <Banner
      tono="warm"
      icono={<FileClock className="size-5" />}
      titulo="Quedó un presupuesto a medio cargar"
      acciones={
        <>
          <Button variant="primary" size="touch" className="md:h-[34px]" onClick={abrir}>
            Continuar
          </Button>
          <Button variant="danger" size="touch" className="md:h-[34px]" onClick={descartar}>
            Descartar borrador
          </Button>
        </>
      }
    >
      {paciente ? <strong className="font-semibold">{paciente}</strong> : 'Sin paciente elegido'}
      {' · '}
      Paso {borrador.paso} de 3, {NOMBRE_PASO[borrador.paso]}
      {' · '}
      guardado {momento}
    </Banner>
  )
}
