'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import {
  MIN_CONTRASENA,
  mailDeUsuario,
  normalizarUsuario,
  usuarioDeMail,
} from '@/lib/auth/usuarios'
import { createAdminClient, createClient, getPerfil } from '@/lib/supabase/server'

export interface Resultado {
  ok: boolean
  error?: string
}

const RE_USUARIO = /^[a-z0-9._-]{3,32}$/

const altaSchema = z.object({
  usuario: z.string().transform(normalizarUsuario).pipe(z.string().regex(RE_USUARIO)),
  contrasena: z.string().min(MIN_CONTRASENA),
  nombre: z.string().trim().min(1).max(120),
  matricula: z.string().trim().max(60).optional(),
  especialidad: z.string().trim().max(120).optional(),
  esAdmin: z.boolean(),
})

/**
 * Sólo un admin administra el equipo.
 *
 * Se verifica acá y no sólo en la UI porque las server actions son
 * alcanzables por POST directo: esconder el botón no protege nada.
 */
async function exigirAdmin(): Promise<Resultado | null> {
  const perfil = await getPerfil()
  if (!perfil) return { ok: false, error: 'Se cerró la sesión. Volvé a entrar.' }
  if (!perfil.esAdmin) {
    return { ok: false, error: 'Sólo un administrador puede hacer esto.' }
  }
  return null
}

/** Alta de un usuario del consultorio: acceso + ficha de profesional. */
export async function crearUsuario(entrada: unknown): Promise<Resultado> {
  const noAutorizado = await exigirAdmin()
  if (noAutorizado) return noAutorizado

  const parseado = altaSchema.safeParse(entrada)
  if (!parseado.success) {
    return { ok: false, error: 'Revisá los datos: usuario, nombre y contraseña son obligatorios.' }
  }
  const { usuario, contrasena, nombre, matricula, especialidad, esAdmin } = parseado.data

  const admin = createAdminClient()

  const { data, error } = await admin.auth.admin.createUser({
    email: mailDeUsuario(usuario),
    password: contrasena,
    email_confirm: true,
  })

  if (error || !data?.user) {
    const texto = (error?.message ?? '').toLowerCase()
    if (texto.includes('already') || texto.includes('registered') || texto.includes('exists')) {
      return { ok: false, error: `El usuario «${usuario}» ya existe.` }
    }
    return { ok: false, error: error?.message ?? 'No se pudo crear el usuario.' }
  }

  const { error: errorFicha } = await admin.from('profesionales').insert({
    user_id: data.user.id,
    nombre,
    matricula: matricula || null,
    especialidad: especialidad || null,
    es_admin: esAdmin,
  })

  if (errorFicha) {
    // La ficha es la que hace usable al usuario: sin ella queda un
    // acceso huérfano que no firma presupuestos. Se deshace el alta.
    await admin.auth.admin.deleteUser(data.user.id)
    return { ok: false, error: 'No se pudo crear la ficha del profesional. No se dio de alta nada.' }
  }

  revalidatePath('/equipo')
  return { ok: true }
}

const claveSchema = z.object({
  userId: z.string().uuid(),
  contrasena: z.string().min(MIN_CONTRASENA),
})

/** Cambia la contraseña de cualquiera del equipo. */
export async function cambiarContrasena(entrada: unknown): Promise<Resultado> {
  const noAutorizado = await exigirAdmin()
  if (noAutorizado) return noAutorizado

  const parseado = claveSchema.safeParse(entrada)
  if (!parseado.success) {
    return { ok: false, error: `La contraseña necesita al menos ${MIN_CONTRASENA} caracteres.` }
  }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.updateUserById(parseado.data.userId, {
    password: parseado.data.contrasena,
  })

  if (error) return { ok: false, error: error.message }

  revalidatePath('/equipo')
  return { ok: true }
}

/** Cambiar la propia contraseña no necesita ser admin. */
export async function cambiarMiContrasena(contrasena: string): Promise<Resultado> {
  const perfil = await getPerfil()
  if (!perfil) return { ok: false, error: 'Se cerró la sesión. Volvé a entrar.' }
  if (!contrasena || contrasena.length < MIN_CONTRASENA) {
    return { ok: false, error: `La contraseña necesita al menos ${MIN_CONTRASENA} caracteres.` }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: contrasena })
  if (error) return { ok: false, error: error.message }

  return { ok: true }
}

const permisoSchema = z.object({
  profesionalId: z.string().uuid(),
  esAdmin: z.boolean(),
})

export async function cambiarPermiso(entrada: unknown): Promise<Resultado> {
  const noAutorizado = await exigirAdmin()
  if (noAutorizado) return noAutorizado

  const parseado = permisoSchema.safeParse(entrada)
  if (!parseado.success) return { ok: false, error: 'Datos inválidos.' }

  const supabase = await createClient()

  // No dejar al consultorio sin ningún administrador: sin admin no hay
  // forma de volver a crear usuarios desde la app.
  if (!parseado.data.esAdmin) {
    const { count } = await supabase
      .from('profesionales')
      .select('id', { count: 'exact', head: true })
      .eq('es_admin', true)

    if ((count ?? 0) <= 1) {
      return { ok: false, error: 'Tiene que quedar al menos un administrador.' }
    }
  }

  const { error } = await supabase
    .from('profesionales')
    .update({ es_admin: parseado.data.esAdmin })
    .eq('id', parseado.data.profesionalId)

  if (error) return { ok: false, error: error.message }

  revalidatePath('/equipo')
  return { ok: true }
}

/** Baja lógica: la ficha nunca se borra porque vive en presupuestos emitidos. */
export async function cambiarActivo(profesionalId: string, activo: boolean): Promise<Resultado> {
  const noAutorizado = await exigirAdmin()
  if (noAutorizado) return noAutorizado

  const supabase = await createClient()
  const { error } = await supabase
    .from('profesionales')
    .update({ activo })
    .eq('id', profesionalId)

  if (error) return { ok: false, error: error.message }

  revalidatePath('/equipo')
  return { ok: true }
}

/** Los usuarios del equipo, con el nombre de acceso resuelto. */
export interface MiembroEquipo {
  profesionalId: string
  userId: string | null
  usuario: string | null
  nombre: string
  matricula: string | null
  especialidad: string | null
  activo: boolean
  esAdmin: boolean
}

export async function listarEquipo(): Promise<MiembroEquipo[]> {
  const perfil = await getPerfil()
  if (!perfil?.esAdmin) return []

  const supabase = await createClient()
  const { data } = await supabase
    .from('profesionales')
    .select('id, user_id, nombre, matricula, especialidad, activo, es_admin')
    .order('nombre')

  const fichas = (data ?? []) as {
    id: string
    user_id: string | null
    nombre: string
    matricula: string | null
    especialidad: string | null
    activo: boolean
    es_admin: boolean
  }[]

  // El mail interno vive en auth, que sólo lee la service role key.
  const admin = createAdminClient()
  const { data: usuarios } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
  const mailPorId = new Map((usuarios?.users ?? []).map((u) => [u.id, u.email ?? '']))

  return fichas.map((f) => ({
    profesionalId: f.id,
    userId: f.user_id,
    usuario: f.user_id ? usuarioDeMail(mailPorId.get(f.user_id)) || null : null,
    nombre: f.nombre,
    matricula: f.matricula,
    especialidad: f.especialidad,
    activo: f.activo,
    esAdmin: f.es_admin,
  }))
}
