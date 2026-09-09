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

/** Sin acentos ni espacios: es lo que se tipea para entrar. */
const RE_USUARIO = /^[a-z0-9._-]{3,32}$/

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
