'use client'

import { Eye, EyeOff, KeyRound, LogIn, TriangleAlert, User } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import * as React from 'react'

import { Banner, Button, Card, CardBody, Field, Input } from '@/components/ui'
import { mailDeUsuario, normalizarUsuario, traducirErrorAuth } from '@/lib/auth/usuarios'
import { createClient } from '@/lib/supabase/client'

const MENSAJES: Record<string, string> = {
  sesion_expirada: 'Se cerró la sesión por inactividad. Volvé a entrar.',
  sin_permiso: 'Esa pantalla es sólo para quien administra el consultorio.',
  dado_de_baja:
    'Tu acceso está dado de baja. Pedile a quien administra el consultorio que te dé de alta de nuevo.',
}

/** A partir de acá el silencio se avisa: algo está tardando. */
const AVISO_LENTO_MS = 6_000
/** Y a partir de acá se corta: la pantalla no se queda colgada para siempre. */
const LIMITE_MS = 25_000

/**
 * Sólo rutas internas. Se decide resolviendo, no mirando el principio.
 *
 * La versión anterior chequeaba el string a mano —que empiece con `/`,
 * que no empiece con `//` ni con `/\`— y eso no alcanza, porque el
 * parser de URL del navegador BORRA los tabs y los saltos de línea
 * antes de resolver la dirección. `?desde=/%09/evil.example.com` llega
 * acá como `"/" + TAB + "/evil.example.com"`, pasa los tres chequeos, y
 * cuando `router.replace()` lo resuelve el tab desaparece y queda
 * `//evil.example.com`: un dominio ajeno. Verificado — el navegador
 * terminaba en `http://evil.example.com/`, y encima DESPUÉS del login
 * exitoso, que es el momento en que alguien está más dispuesto a
 * escribir sus datos en una pantalla que dice Smile Lab.
 *
 * Resolver contra el propio origen y comparar es la única forma de
 * saber a dónde va a ir el navegador de verdad: lo que se compara es el
 * resultado del mismo parser que después va a navegar.
 */
function destinoSeguro(desde: string | null): string {
  if (!desde) return '/'
  if (typeof window === 'undefined') return '/'
  try {
    const url = new URL(desde, window.location.origin)
    if (url.origin !== window.location.origin) return '/'
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return '/'
  }
}

export function LoginForm({
  errorInicial,
  aviso,
}: {
  errorInicial: string | null
  /** Server component en streaming: el cartel del admin inicial. */
  aviso?: React.ReactNode
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const claveRef = React.useRef<HTMLInputElement>(null)
  const [verClave, setVerClave] = React.useState(false)
  const [mayusculas, setMayusculas] = React.useState(false)

  /**
   * `entrando` no se apaga cuando la respuesta llega bien: se apaga
   * cuando la pantalla cambia. Apagarlo antes devolvía el botón a
   * «Entrar» mientras la navegación viajaba, y en una conexión lenta eso
   * se lee como que no pasó nada — y se vuelve a clickear.
   */
  const [entrando, setEntrando] = React.useState(false)
  /**
   * Si React ya tomó el control de la página.
   *
   * Entrar depende de JavaScript —la sesión la abre el cliente de
   * Supabase en el navegador—, así que hasta que no hidrate no hay nada
   * que el botón pueda hacer bien. Mejor decirlo que dejar que el
   * navegador mande el formulario por su cuenta.
   */
  const hidratado = React.useSyncExternalStore(
    // Nada que suscribir: el valor cambia una sola vez, al hidratar.
    () => () => {},
    () => true,
    () => false,
  )
  /**
   * El `disabled` del botón necesita un render, y ⏎ puede repetirse
   * antes: dos altas de sesión seguidas se comen el límite de intentos
   * de GoTrue y devuelven un 429 que parece contraseña mal puesta.
   */
  const enviandoRef = React.useRef(false)
  const [lento, setLento] = React.useState(false)
  const [error, setError] = React.useState<string | null>(
    errorInicial ? (MENSAJES[errorInicial] ?? 'No se pudo entrar. Probá de nuevo.') : null,
  )

  function fallar(mensaje: string) {
    enviandoRef.current = false
    setError(mensaje)
    setEntrando(false)
    setLento(false)
    // El foco vuelve a la contraseña: es lo que se vuelve a escribir, y
    // moverlo hace que el lector de pantalla llegue al aviso.
    const campo = claveRef.current
    if (campo) {
      campo.focus()
      campo.select()
    }
  }

  async function onSubmit(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (enviandoRef.current) return
    enviandoRef.current = true

    /**
     * Los valores salen del formulario, no de un `useState`.
     *
     * El gestor de contraseñas del navegador escribe los dos campos de
     * una y no siempre dispara el `change` de React —sobre todo si
     * completa antes de que hidrate—: con campos controlados el
     * formulario se veía lleno y «Entrar» contestaba «Completá usuario y
     * contraseña». Leyendo del DOM eso no puede pasar.
     */
    const datos = new FormData(evento.currentTarget)
    const usuario = normalizarUsuario(String(datos.get('username') ?? ''))
    const contrasena = String(datos.get('password') ?? '')

    if (!usuario || !contrasena) {
      enviandoRef.current = false
      setError('Completá usuario y contraseña.')
      const campo = usuario ? claveRef.current : evento.currentTarget.elements.namedItem('usuario')
      if (campo instanceof HTMLElement) campo.focus()
      return
    }

    setError(null)
    setEntrando(true)
    setLento(false)

    const avisoLento = window.setTimeout(() => setLento(true), AVISO_LENTO_MS)
    let corte: number | undefined

    try {
      const supabase = createClient()
      const entrada = supabase.auth.signInWithPassword({
        email: mailDeUsuario(usuario),
        password: contrasena,
      })

      // `signInWithPassword` no acepta un `AbortSignal`, así que el
      // corte es una carrera: si Supabase no contesta, la pantalla deja
      // de esperar y dice qué hacer en vez de girar para siempre.
      const respuesta = await Promise.race([
        entrada,
        new Promise<'tarde'>((resolver) => {
          corte = window.setTimeout(() => resolver('tarde'), LIMITE_MS)
        }),
      ])

      if (respuesta === 'tarde') {
        fallar('Supabase no contestó. Fijate la conexión y probá de nuevo.')
        return
      }

      if (respuesta.error) {
        fallar(
          traducirErrorAuth(respuesta.error.message, { status: respuesta.error.status, usuario }),
        )
        return
      }

      // `refresh` para que el server vea la cookie nueva antes de navegar.
      router.replace(destinoSeguro(searchParams.get('desde')))
      router.refresh()
    } catch {
      fallar('No se pudo conectar. Fijate la conexión y probá de nuevo.')
    } finally {
      window.clearTimeout(avisoLento)
      if (corte !== undefined) window.clearTimeout(corte)
    }
  }

  /** Bloq Mayús con una contraseña oculta explica el 90 % de los «no entra». */
  function mirarMayusculas(evento: React.KeyboardEvent<HTMLInputElement>) {
    setMayusculas(evento.getModifierState?.('CapsLock') ?? false)
  }

  return (
    <Card className="animate-enter">
      <CardBody className="pt-6">
        <h1 className="t-h2">Ingresar</h1>
        <p className="mt-1.5 text-[14px] leading-relaxed text-muted">
          Entrá con el usuario y la contraseña del consultorio.
        </p>

        {aviso}

        {/*
          La región vive siempre, aunque esté vacía: un `aria-live` que
          se monta junto con el mensaje no se anuncia. Sin esto el error
          aparecía en pantalla y el lector de pantalla no decía nada.
        */}
        <div aria-live="polite" aria-atomic="true">
          {error && (
            <Banner
              className="mt-5"
              tono="warm"
              icono={<TriangleAlert className="size-4" />}
              titulo="No se pudo entrar"
            >
              {error}
            </Banner>
          )}
        </div>

        {/*
          `method="post"` no es decorativo: sin él, un envío NATIVO
          —el que ocurre cuando el HTML ya llegó pero el bundle todavía
          no, que en el mostrador con mala señal pasa— es un GET, y un
          GET pone los campos en el query string. Los campos se llaman
          `username` y `password` para que el gestor de contraseñas los
          complete, así que la URL terminaba siendo
          `…/login?username=recepcion&password=Clave-Real-2026`:
          a la vista de quien esté parado del otro lado del mostrador,
          en el historial del navegador y en el log de accesos del
          servidor. Verificado con JavaScript apagado.

          El botón deshabilitado hasta hidratar es la otra mitad: con el
          único botón de submit deshabilitado el navegador tampoco manda
          con ⏎, así que el POST de arriba queda como red y no como
          camino.
        */}
        <form
          className="mt-5 flex flex-col gap-4"
          method="post"
          onSubmit={onSubmit}
          noValidate
        >
          <Field label="Usuario" htmlFor="usuario">
            <div className="relative">
              <User
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint"
              />
              <Input
                id="usuario"
                name="username"
                autoComplete="username"
                autoFocus
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="next"
                placeholder="admin"
                className="h-12 pl-9 text-[16px]"
              />
            </div>
          </Field>

          <Field label="Contraseña" htmlFor="contrasena">
            <div className="relative">
              <KeyRound
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint"
              />
              <Input
                ref={claveRef}
                id="contrasena"
                name="password"
                type={verClave ? 'text' : 'password'}
                autoComplete="current-password"
                enterKeyHint="go"
                placeholder="••••••••"
                className="h-12 pl-9 pr-12 text-[16px]"
                onKeyDown={mirarMayusculas}
                onKeyUp={mirarMayusculas}
                onBlur={() => setMayusculas(false)}
              />
              <button
                type="button"
                onClick={() => {
                  setVerClave((v) => !v)
                  claveRef.current?.focus()
                }}
                aria-label={verClave ? 'Ocultar la contraseña' : 'Mostrar la contraseña'}
                aria-pressed={verClave}
                className="absolute right-1 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-pill text-faint transition-colors hover:bg-tint hover:text-ink"
              >
                {verClave ? (
                  <EyeOff className="size-4 stroke-[1.75]" aria-hidden />
                ) : (
                  <Eye className="size-4 stroke-[1.75]" aria-hidden />
                )}
              </button>
            </div>
          </Field>

          {mayusculas && (
            <p className="-mt-2 t-helper text-warm-ink" role="status">
              Bloq Mayús está activado.
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            size="touch"
            full
            loading={entrando}
            disabled={!hidratado}
          >
            {!entrando && <LogIn aria-hidden />}
            {entrando ? 'Entrando…' : hidratado ? 'Entrar' : 'Cargando…'}
          </Button>

          <p className="min-h-4 text-center t-helper" aria-live="polite">
            {lento && entrando ? 'Está tardando más de lo normal. Seguimos esperando…' : ''}
          </p>
        </form>

        <p className="mt-1 t-helper">
          ¿No tenés usuario? Pediselo a quien administra el consultorio.
        </p>
      </CardBody>
    </Card>
  )
}
