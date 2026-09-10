/**
 * Usuario + contraseña, sin mail.
 *
 * El consultorio entra con un nombre de usuario. Supabase Auth exige un
 * mail para el login con contraseña, así que se deriva uno interno a
 * partir del usuario: `admin` → `admin@smilelab.com.ar`. Ese mail nunca
 * se muestra, nunca se usa para escribir y nunca recibe nada — el
 * proveedor de email está apagado y las altas las hace un admin.
 */

/** Dominio del mail interno. No se manda correo a estas direcciones. */
export const DOMINIO_INTERNO = 'smilelab.com.ar'

/** Usuario del administrador que se crea solo la primera vez. */
export const USUARIO_ADMIN = 'admin'

/** Contraseña inicial de ese administrador. Cambiala desde Equipo. */
export const CONTRASENA_ADMIN_INICIAL = 'smilelab'

export const MIN_CONTRASENA = 6

/**
 * Sin acentos ni espacios: es lo que se tipea para entrar.
 *
 * Se exporta porque el schema de zod de `app/actions/equipo.ts` valida
 * lo mismo. Tenerla dos veces era garantía de que en algún momento
 * dijeran cosas distintas y el formulario aceptara algo que el servidor
 * rechaza.
 */
export const RE_USUARIO = /^[a-z0-9._-]{3,32}$/

export function normalizarUsuario(valor: string): string {
  return valor.trim().toLowerCase()
}

export function mailDeUsuario(usuario: string): string {
  return `${normalizarUsuario(usuario)}@${DOMINIO_INTERNO}`
}

export function usuarioDeMail(mail: string | null | undefined): string {
  if (!mail) return ''
  return mail.split('@')[0] ?? ''
}

/** `null` si está bien; si no, el motivo para mostrar bajo el campo. */
export function validarUsuario(valor: string): string | null {
  const usuario = normalizarUsuario(valor)
  if (!usuario) return 'Escribí un nombre de usuario.'
  if (usuario.length < 3) return 'Tiene que tener al menos 3 caracteres.'
  if (usuario.length > 32) return 'Como máximo 32 caracteres.'
  if (!RE_USUARIO.test(usuario)) {
    return 'Sólo letras sin acento, números, punto, guión y guión bajo.'
  }
  return null
}

export function validarContrasena(valor: string): string | null {
  if (!valor) return 'Escribí una contraseña.'
  if (valor.length < MIN_CONTRASENA) {
    return `Tiene que tener al menos ${MIN_CONTRASENA} caracteres.`
  }
  return null
}

/* ═══════════════════════════════════════════════════════════
   Sugerencias para el alta
   ═══════════════════════════════════════════════════════════ */

/** Saca acentos y deja sólo lo que `RE_USUARIO` acepta. */
function soloLegal(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
}

/**
 * Un usuario propuesto a partir del nombre.
 *
 * El nombre se carga como «Apellido, Nombre» (así sale firmando el
 * presupuesto), pero para entrar se usa el nombre de pila: «Álvarez,
 * María» → `maria`. Sin coma se toma la primera palabra, que es lo que
 * pasa con «María Álvarez».
 *
 * Devuelve `''` si no queda nada usable: el campo entonces se deja como
 * está y lo escribe quien administra.
 */
export function sugerirUsuario(nombre: string): string {
  const limpio = nombre.trim()
  if (!limpio) return ''

  const partes = limpio.includes(',')
    ? (limpio.split(',')[1] ?? '').trim().split(/\s+/)
    : limpio.split(/\s+/)

  const pila = soloLegal(partes[0] ?? '')
  if (pila.length >= 3) return pila.slice(0, 32)

  // Nombres cortos («Ana Ruiz» está bien, «Li Wang» no llega a tres):
  // se completa con el otro apellido antes de rendirse.
  const resto = soloLegal(limpio.replace(',', ' ').split(/\s+/).slice(1).join(''))
  const junto = (pila + resto).slice(0, 32)
  return junto.length >= 3 ? junto : ''
}

/**
 * Alfabeto sin caracteres que se confunden al dictar o al copiar a mano:
 * nada de `0`/`O`, `1`/`l`/`I`.
 */
const ALFABETO = 'abcdefghjkmnpqrstuvwxyz23456789'

/**
 * Una contraseña sugerida para pasarle a alguien.
 *
 * Tres grupos de cuatro separados por guión (`k7r3-qpx4-m9tz`): se lee
 * de la pantalla sin equivocarse, se dicta por teléfono y se copia de un
 * toque, que es lo que de verdad pasa en el mostrador. Quien la recibe
 * la cambia después desde «Mi contraseña».
 */
export function sugerirContrasena(): string {
  const largo = 12
  const bytes = new Uint32Array(largo)

  const azar = globalThis.crypto
  if (azar?.getRandomValues) {
    azar.getRandomValues(bytes)
  } else {
    // No debería pasar (Node 18+ y todos los navegadores lo tienen),
    // pero una contraseña es lo último que puede quedar sin generar.
    for (let i = 0; i < largo; i++) bytes[i] = Math.floor(Math.random() * 0xffffffff)
  }

  const chars = Array.from(bytes, (n) => ALFABETO[n % ALFABETO.length])
  return `${chars.slice(0, 4).join('')}-${chars.slice(4, 8).join('')}-${chars.slice(8).join('')}`
}

/* ═══════════════════════════════════════════════════════════
   Traducción de los errores de GoTrue
   ═══════════════════════════════════════════════════════════ */

/**
 * Lo que devuelve Supabase, en castellano y accionable.
 *
 * GoTrue contesta en inglés y con la jerga del proveedor («User is
 * banned», «Unable to validate email address»). Mostrarlo tal cual en el
 * mostrador no dice qué hacer, y en algunos casos —el mail interno— ni
 * siquiera habla de algo que la persona pueda ver.
 */
export function traducirErrorAuth(
  mensaje: string | null | undefined,
  opciones: { status?: number; usuario?: string } = {},
): string {
  const texto = (mensaje ?? '').toLowerCase()
  const quien = opciones.usuario ? `«${opciones.usuario}»` : 'Ese usuario'

  if (texto.includes('banned') || texto.includes('user_banned')) {
    return 'Este usuario está dado de baja. Pedile a quien administra que lo reactive.'
  }
  if (texto.includes('invalid login credentials')) {
    return 'Usuario o contraseña incorrectos.'
  }
  if (opciones.status === 429 || texto.includes('rate limit') || texto.includes('too many')) {
    return 'Demasiados intentos seguidos. Esperá un minuto y probá de nuevo.'
  }
  if (texto.includes('for security purposes')) {
    return 'Supabase pide esperar unos segundos entre intentos. Probá de nuevo enseguida.'
  }
  if (texto.includes('already') || texto.includes('registered') || texto.includes('exists')) {
    return `${quien} ya está en uso. Elegí otro.`
  }
  if (texto.includes('should be different')) {
    return 'La contraseña nueva tiene que ser distinta de la actual.'
  }
  if (texto.includes('password') && texto.includes('at least')) {
    return `La contraseña necesita al menos ${MIN_CONTRASENA} caracteres.`
  }
  if (texto.includes('weak') || texto.includes('pwned')) {
    return 'Esa contraseña es demasiado común. Probá con la sugerida.'
  }
  if (texto.includes('unable to validate email')) {
    return 'El usuario tiene caracteres que Supabase no acepta. Usá sólo letras, números, punto, guión y guión bajo.'
  }
  if (texto.includes('email logins are disabled') || texto.includes('not enabled')) {
    return 'El login con contraseña está apagado en Supabase. Activá Authentication → Providers → Email.'
  }
  if (texto.includes('signups not allowed') || texto.includes('user not allowed')) {
    return 'Supabase no está dejando dar de alta. Revisá que el proveedor Email esté activo.'
  }
  if (texto.includes('failed to fetch') || texto.includes('network')) {
    return 'No se pudo conectar. Fijate la conexión y probá de nuevo.'
  }
  return 'No se pudo completar. Probá de nuevo en un momento.'
}
