'use server'

import { revalidatePath } from 'next/cache'

import {
  MIN_CONTRASENA,
  RE_USUARIO,
  mailDeUsuario,
  normalizarUsuario,
  traducirErrorAuth,
  usuarioDeMail,
} from '@/lib/auth/usuarios'
import { createAdminClient, createClient, getPerfil, type Perfil } from '@/lib/supabase/server'
import { z } from '@/lib/zod'

export interface Resultado {
  ok: boolean
  error?: string
}

/** El alta devuelve el usuario ya normalizado: es lo que hay que pasarle a la persona. */
export interface ResultadoAlta extends Resultado {
  usuario?: string
}

const altaSchema = z.object({
  usuario: z.string().transform(normalizarUsuario).pipe(z.string().regex(RE_USUARIO)),
  contrasena: z.string().min(MIN_CONTRASENA),
  nombre: z.string().trim().min(1).max(120),
  matricula: z.string().trim().max(60).optional(),
  especialidad: z.string().trim().max(120).optional(),
  esAdmin: z.boolean(),
})

type Autorizacion = { ok: true; perfil: Perfil } | { ok: false; error: string }

/**
 * Sólo un admin administra el equipo.
 *
 * Se verifica acá y no sólo en la UI porque las server actions son
 * alcanzables por POST directo: esconder el botón no protege nada.
 *
 * Devuelve el perfil porque varias acciones necesitan saber quién está
 * pidiendo, no sólo que tenga permiso: nadie se da de baja a sí mismo.
 */
async function exigirAdmin(): Promise<Autorizacion> {
  const perfil = await getPerfil()
  if (!perfil) return { ok: false, error: 'Se cerró la sesión. Volvé a entrar.' }
  if (!perfil.esAdmin) {
    return { ok: false, error: 'Sólo un administrador puede hacer esto.' }
  }
  return { ok: true, perfil }
}

/**
 * ¿Cuántos administradores pueden entrar hoy?
 *
 * «Administrador» a secas no alcanza como cuenta: una ficha marcada
 * como admin pero dada de baja —o sin acceso, que existe: un
 * profesional que sólo firma presupuestos— no puede volver a dar de
 * alta a nadie. Contarlas dejaba pasar el caso que la guarda quería
 * evitar: dos admins, uno inactivo, se le quita el permiso al activo y
 * el consultorio se queda sin nadie que administre.
 */
async function adminsConAcceso(excepto?: string): Promise<number> {
  const supabase = await createClient()
  let consulta = supabase
    .from('profesionales')
    .select('id', { count: 'exact', head: true })
    .eq('es_admin', true)
    .eq('activo', true)
    .not('user_id', 'is', null)

  if (excepto) consulta = consulta.neq('id', excepto)

  const { count, error } = await consulta
  // Si no se puede contar, se asume lo peor: mejor bloquear un cambio
  // reversible que dejar al consultorio sin acceso.
  if (error) return 0
  return count ?? 0
}

/** Alta de un usuario del consultorio: acceso + ficha de profesional. */
export async function crearUsuario(entrada: unknown): Promise<ResultadoAlta> {
  const auth = await exigirAdmin()
  if (!auth.ok) return auth

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
    console.error('[equipo] alta fallida', error?.message)
    return { ok: false, error: traducirErrorAuth(error?.message, { status: error?.status, usuario }) }
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
    console.error('[equipo] ficha fallida, se deshace el alta', errorFicha.message)
    await admin.auth.admin.deleteUser(data.user.id)
    return { ok: false, error: 'No se pudo crear la ficha del profesional. No se dio de alta nada.' }
  }

  revalidatePath('/equipo')
  return { ok: true, usuario }
}

const claveSchema = z.object({
  userId: z.string().uuid(),
  contrasena: z.string().min(MIN_CONTRASENA),
})

/** Cambia la contraseña de cualquiera del equipo. */
export async function cambiarContrasena(entrada: unknown): Promise<Resultado> {
  const auth = await exigirAdmin()
  if (!auth.ok) return auth

  const parseado = claveSchema.safeParse(entrada)
  if (!parseado.success) {
    return { ok: false, error: `La contraseña necesita al menos ${MIN_CONTRASENA} caracteres.` }
  }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.updateUserById(parseado.data.userId, {
    password: parseado.data.contrasena,
  })

  if (error) {
    console.error('[equipo] cambio de contraseña fallido', error.message)
    return { ok: false, error: traducirErrorAuth(error.message, { status: error.status }) }
  }

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
  if (error) {
    console.error('[equipo] cambio de mi contraseña fallido', error.message)
    return { ok: false, error: traducirErrorAuth(error.message, { status: error.status }) }
  }

  return { ok: true }
}

const permisoSchema = z.object({
  profesionalId: z.string().uuid(),
  esAdmin: z.boolean(),
})

export async function cambiarPermiso(entrada: unknown): Promise<Resultado> {
  const auth = await exigirAdmin()
  if (!auth.ok) return auth

  const parseado = permisoSchema.safeParse(entrada)
  if (!parseado.success) return { ok: false, error: 'Datos inválidos.' }

  const supabase = await createClient()

  // No dejar al consultorio sin ningún administrador que pueda entrar:
  // sin eso no hay forma de volver a crear usuarios desde la app, y la
  // única salida es el SQL Editor de Supabase.
  if (!parseado.data.esAdmin) {
    if ((await adminsConAcceso(parseado.data.profesionalId)) === 0) {
      return {
        ok: false,
        error:
          parseado.data.profesionalId === auth.perfil.profesionalId
            ? 'Sos el único administrador con acceso. Nombrá a otro antes de dejar de administrar.'
            : 'Tiene que quedar al menos un administrador con acceso.',
      }
    }
  }

  const { error } = await supabase
    .from('profesionales')
    .update({ es_admin: parseado.data.esAdmin })
    .eq('id', parseado.data.profesionalId)

  if (error) {
    console.error('[equipo] cambio de permiso fallido', error.message)
    return { ok: false, error: 'No se pudo cambiar el permiso. Probá de nuevo.' }
  }

  revalidatePath('/equipo')
  return { ok: true }
}

/**
 * Baja lógica: la ficha nunca se borra porque vive en presupuestos
 * emitidos. Pero dar de baja **también saca el acceso**.
 *
 * Antes no: la pantalla se llama "Equipo y accesos" y dice que las
 * fichas se desactivan, y sin embargo desactivar sólo la sacaba del
 * selector de profesional del wizard. Quien se iba del consultorio
 * seguía entrando con su usuario y su contraseña, viendo todos los
 * presupuestos y todos los montos. La única forma real de cortarle el
 * acceso era el dashboard de Supabase.
 *
 * Se implementa como un ban de GoTrue y no borrando el usuario porque
 * tiene que ser reversible: reactivar devuelve el acceso con la misma
 * contraseña.
 *
 * El orden es **acceso primero, ficha después**, y si la ficha falla se
 * deshace el acceso. Al revés quedaba el estado peligroso: la pantalla
 * mostrando «sin acceso» con la persona todavía pudiendo entrar.
 */
export async function cambiarActivo(profesionalId: string, activo: boolean): Promise<Resultado> {
  const auth = await exigirAdmin()
  if (!auth.ok) return auth

  const supabase = await createClient()

  const { data: ficha, error: errorFicha } = await supabase
    .from('profesionales')
    .select('id, user_id, es_admin, nombre')
    .eq('id', profesionalId)
    .maybeSingle()

  if (errorFicha) return { ok: false, error: 'No se pudo leer la ficha. Probá de nuevo.' }
  if (!ficha) return { ok: false, error: 'No se encontró la ficha.' }

  if (!activo) {
    // Sacarse el acceso a uno mismo deja la pantalla a medio camino y
    // sin nadie del otro lado para deshacerlo.
    if (ficha.id === auth.perfil.profesionalId) {
      return { ok: false, error: 'No podés darte de baja a vos mismo.' }
    }

    // Mismo motivo que en `cambiarPermiso`: sin ningún admin con acceso
    // el consultorio no puede volver a dar de alta a nadie.
    if (ficha.es_admin && (await adminsConAcceso(ficha.id)) === 0) {
      return { ok: false, error: 'Es el único administrador con acceso. Nombrá a otro primero.' }
    }
  }

  const admin = ficha.user_id ? createAdminClient() : null

  if (admin && ficha.user_id) {
    const { error: errorAcceso } = await admin.auth.admin.updateUserById(ficha.user_id, {
      // 100 años ≈ para siempre; `none` lo levanta.
      ban_duration: activo ? 'none' : '876000h',
    })

    if (errorAcceso) {
      console.error('[equipo] no se pudo mover el acceso', errorAcceso.message)
      return {
        ok: false,
        error: activo
          ? 'No se pudo devolver el acceso. No se cambió nada.'
          : 'No se pudo cortar el acceso. No se cambió nada.',
      }
    }
  }

  const { error } = await supabase
    .from('profesionales')
    .update({ activo })
    .eq('id', profesionalId)

  if (error) {
    console.error('[equipo] no se pudo cambiar la ficha', error.message)
    // El acceso ya se movió: se vuelve atrás para no dejar a alguien
    // fuera sin que la pantalla lo muestre.
    if (admin && ficha.user_id) {
      await admin.auth.admin.updateUserById(ficha.user_id, {
        ban_duration: activo ? '876000h' : 'none',
      })
    }
    return { ok: false, error: 'No se pudo cambiar la ficha. No se cambió nada.' }
  }

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
  const { data, error } = await supabase
    .from('profesionales')
    .select('id, user_id, nombre, matricula, especialidad, activo, es_admin')
    // Quien todavía trabaja acá arriba; las bajas al pie, que es donde
    // se las busca.
    .order('activo', { ascending: false })
    .order('nombre')

  if (error) console.error('[equipo] no se pudo listar', error.message)

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
  const { data: usuarios, error: errorUsuarios } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  })
  if (errorUsuarios) console.error('[equipo] no se pudo leer auth', errorUsuarios.message)
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
