import { ShieldCheck } from 'lucide-react'

import { Banner } from '@/components/ui'
import { CONTRASENA_ADMIN_INICIAL, USUARIO_ADMIN } from '@/lib/auth/usuarios'
import { asegurarAdminInicial } from '@/lib/auth/bootstrap'

/**
 * El cartel del primer arranque, y sólo eso.
 *
 * Vive en su propio componente para poder colgarlo de un `Suspense`: el
 * chequeo del admin inicial es una ida y vuelta a Supabase que hace
 * falta el primer día del consultorio y ningún otro, y antes bloqueaba
 * el HTML de `/login` entero. Con Supabase lento la pantalla de entrar
 * no aparecía hasta que la consulta volviera. Ahora el formulario pinta
 * de una y esto llega después, o no llega.
 */
export async function AvisoAdminInicial() {
  const reciénCreado = await asegurarAdminInicial()
  if (!reciénCreado) return null

  return (
    <Banner
      className="mt-5"
      tono="info"
      icono={<ShieldCheck className="size-4" />}
      titulo="Se creó el usuario administrador"
    >
      Usuario <strong className="font-semibold">{USUARIO_ADMIN}</strong>, contraseña{' '}
      <strong className="font-semibold">{CONTRASENA_ADMIN_INICIAL}</strong>. Cambiala desde «Mi
      contraseña» apenas entres.
    </Banner>
  )
}
