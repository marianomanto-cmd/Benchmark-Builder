/**
 * Tipos y constantes del formulario de perfil.
 *
 * Viven fuera de `auth.ts` porque un archivo `'use server'` sólo puede
 * exportar funciones asíncronas: cualquier objeto exportado desde ahí
 * rompe el build.
 */

export interface EstadoPerfil {
  ok: boolean
  mensaje: string | null
}

export const ESTADO_PERFIL_INICIAL: EstadoPerfil = { ok: false, mensaje: null }
