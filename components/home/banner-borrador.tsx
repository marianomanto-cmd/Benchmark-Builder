'use client'

import { FileClock } from 'lucide-react'
import { toast } from 'sonner'

import { Banner, Button } from '@/components/ui'
import { useWizard } from '@/components/wizard/use-wizard'
import { borrarBorrador, useBorradorGuardado } from '@/lib/draft'
import { diaCalendario, fechaHora, hora, isoDate } from '@/lib/formato'

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
  /*
   * `diaCalendario()` y no `guardado.slice(0, 10)`: el sello se escribe
   * con `toISOString()`, que es UTC, y se comparaba contra el día del
   * consultorio. Entre las 21:00 y la medianoche de Argentina el sello
   * ya lleva la fecha de mañana, así que un borrador guardado anoche a
   * las 22:00 pasaba el test al día siguiente y el banner decía
   * «guardado hoy a las 22:00» — una hora que todavía no pasó. El caso
   * espejo también existía: lo guardado hoy a las 21:30 se anunciaba
   * como «el 10 sep, 21:30» en vez de «hoy».
   */
  const esDeHoy = diaCalendario(guardado) === isoDate()

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
