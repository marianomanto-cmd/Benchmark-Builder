'use client'

import { ArrowLeft, MailCheck, TriangleAlert } from 'lucide-react'
import * as React from 'react'

import { Banner, Button, Field, Input } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'

type Estado = 'idle' | 'enviando' | 'enviado' | 'error'

/**
 * Dominio permitido para el equipo del consultorio. Se valida acá para dar
 * un mensaje entendible antes de gastar un mail; la restricción que manda
 * es la de Supabase Auth, esto es sólo cortesía.
 */

/** Segundos de espera antes de habilitar el reenvío. */

/** Errores que puede devolver el callback en `?error=`. */
const MENSAJES_CALLBACK: Record<string, string> = {
  expirado: 'El enlace venció. Pedí uno nuevo, dura una hora.',
  usado: 'Ese enlace ya se usó. Pedí uno nuevo desde acá.',
  sin_codigo: 'El enlace llegó incompleto. Pedí uno nuevo desde acá.',
  enlace_invalido: 'El enlace no funcionó. Puede haber vencido o ya haberse usado.',
  acceso_denegado: 'Ese mail no tiene acceso al consultorio.',
}

const RE_MAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function validarMail(valor: string): string | null {
  const mail = valor.trim().toLowerCase()
  if (!mail) return 'Escribí tu mail para continuar.'
  if (!RE_MAIL.test(mail)) return 'Ese mail no parece válido. Revisalo y probá de nuevo.'
  // Acá no se filtra por dominio: quién puede entrar lo decide Supabase,
  // con los signups cerrados y las altas hechas a mano. Un chequeo en el
  // cliente sólo daría la ilusión de control, y se saltea con F12.
  return null
}

/**
 * URL a la que vuelve el magic link. `desde` se propaga para devolver al
 * profesional exactamente a la pantalla que quiso abrir; el callback la
 * vuelve a validar antes de redirigir.
 */
function urlDeVuelta(desde: string | null): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || window.location.origin).replace(/\/+$/, '')
  const esInterna = Boolean(desde) && desde!.startsWith('/') && !desde!.startsWith('//')
  const cola = esInterna ? `?${new URLSearchParams({ desde: desde! }).toString()}` : ''
  return `${base}/auth/callback${cola}`
}

function mensajeDeSupabase(error: { message?: string; status?: number }): string {
  const texto = (error.message ?? '').toLowerCase()
  if (error.status === 429 || texto.includes('rate limit') || texto.includes('too many')) {
    return 'Pediste varios enlaces seguidos. Esperá un minuto y volvé a intentar.'
  }
  if (texto.includes('not allowed') || texto.includes('signups not allowed')) {
    return 'Ese mail no tiene acceso al consultorio. Pedí el alta y volvé a intentar.'
  }
  return 'No pudimos mandar el enlace. Revisá la conexión y probá de nuevo.'
}

export function LoginForm({
  desde,
  errorInicial,
}: {
  desde: string | null
  errorInicial: string | null
}) {
  const supabase = React.useMemo(() => createClient(), [])

  const [mail, setMail] = React.useState('')
  const [estado, setEstado] = React.useState<Estado>('idle')
  const [mensajeError, setMensajeError] = React.useState<string | null>(
    errorInicial ? (MENSAJES_CALLBACK[errorInicial] ?? MENSAJES_CALLBACK.enlace_invalido) : null,
  )
  const [errorCampo, setErrorCampo] = React.useState<string | null>(null)
  // El reenvío es su propio flag: mientras corre, la pantalla sigue siendo
  // «Revisá tu correo», no vuelve al formulario.
  const [reenviando, setReenviando] = React.useState(false)

  async function enviar(mailDestino: string, esReenvio = false) {
    if (esReenvio) setReenviando(true)
    else setEstado('enviando')
    setMensajeError(null)

    const { error } = await supabase.auth.signInWithOtp({
      email: mailDestino,
      options: { emailRedirectTo: urlDeVuelta(desde) },
    })

    if (error) {
      setMensajeError(mensajeDeSupabase(error))
      if (esReenvio) setReenviando(false)
      else setEstado('error')
      return
    }

    if (esReenvio) setReenviando(false)
    setEstado('enviado')
  }

  function onSubmit(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const problema = validarMail(mail)
    setErrorCampo(problema)
    if (problema) return
    void enviar(mail.trim().toLowerCase())
  }

  /* ── Estado enviado ─────────────────────────────────────── */

  if (estado === 'enviado') {
    return (
      <div className="animate-enter text-center">
        <div className="mx-auto mb-4 grid size-14 place-items-center rounded-pill bg-tint">
          <MailCheck className="size-7 stroke-[1.6] text-primary" aria-hidden />
        </div>

        <h1 className="t-h2">Revisá tu correo</h1>
        <p className="mt-2 t-body">
          Te mandamos un enlace de acceso a{' '}
          <strong className="font-semibold text-ink">{mail.trim().toLowerCase()}</strong>. Abrilo
          desde este mismo teléfono o computadora.
        </p>
        <p className="mt-2 t-helper">
          El enlace dura una hora. Después de entrar, la sesión queda abierta en este dispositivo:
          no vas a tener que repetirlo entre paciente y paciente.
        </p>

        {mensajeError && (
          <Banner
            className="mt-5 text-left"
            tono="warm"
            icono={<TriangleAlert className="size-4" />}
            titulo="No se pudo reenviar"
          >
            {mensajeError}
          </Banner>
        )}

        <div className="mt-6 flex flex-col gap-2">
          <Button
            variant="secondary"
            size="touch"
            full
            loading={reenviando}
            onClick={() => void enviar(mail.trim().toLowerCase(), true)}
          >
            {/* Sin cuenta regresiva: si alguien pide demasiados enlaces
                seguidos, Supabase responde 429 y ese mensaje ya está
                traducido. Hacer esperar 45 segundos por las dudas es
                castigar al que no llegó el mail. */}
            {reenviando ? 'Mandando de nuevo…' : 'Reenviar enlace'}
          </Button>

          <Button
            variant="ghost"
            size="touch"
            full
            disabled={reenviando}
            onClick={() => {
              setEstado('idle')
              setMensajeError(null)
              setErrorCampo(null)
            }}
          >
            <ArrowLeft aria-hidden />
            Usar otro mail
          </Button>
        </div>
      </div>
    )
  }

  /* ── Estados idle / enviando / error ────────────────────── */

  return (
    <div className="animate-enter">
      <h1 className="t-h2">Ingresar</h1>
      <p className="mt-2 t-body">Ingresá con tu mail y te mandamos un enlace de acceso.</p>

      {mensajeError && (
        <Banner
          className="mt-5"
          tono="warm"
          icono={<TriangleAlert className="size-4" />}
          titulo="No pudimos entrar"
        >
          {mensajeError}
        </Banner>
      )}

      <form className="mt-6 flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        <Field
          label="Mail"
          htmlFor="mail"
          error={errorCampo}
          helper="La casilla que usás en el consultorio."
        >
          <Input
            id="mail"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoFocus
            enterKeyHint="send"
            placeholder="nombre@consultorio.com"
            className="h-12 text-[16px]"
            invalido={Boolean(errorCampo)}
            value={mail}
            disabled={estado === 'enviando'}
            onChange={(evento) => {
              setMail(evento.target.value)
              if (errorCampo) setErrorCampo(null)
            }}
          />
        </Field>

        <Button type="submit" variant="primary" size="touch" full loading={estado === 'enviando'}>
          {estado === 'enviando' ? 'Mandando el enlace…' : 'Mandame el enlace'}
        </Button>
      </form>

      <p className="mt-5 t-helper">
        No hay contraseña: cada vez que entrás por primera vez en un dispositivo pedís un enlace
        nuevo.
      </p>
    </div>
  )
}
