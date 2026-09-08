import { redirect } from 'next/navigation'

import { Tabbar } from '@/components/shell/tabbar'
import { Topbar } from '@/components/shell/topbar'
import type { UsuarioShell } from '@/components/shell/menu-usuario'
import { WizardPresupuesto } from '@/components/wizard/wizard-presupuesto'
import { getSesion } from '@/lib/supabase/server'

/**
 * Shell de la app con sesión.
 *
 * El chequeo del `proxy` es optimista (sólo mira la cookie); acá se
 * verifica de verdad contra Supabase antes de renderizar nada.
 *
 * El wizard se monta UNA sola vez, en el layout: es un modal sobre la
 * ruta actual, activado por `?nuevo=1`, y tiene que sobrevivir a los
 * cambios de pantalla sin desmontarse.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profesional } = await getSesion()

  if (!user) redirect('/login')

  const email = user.email ?? ''
  const metadata = user.user_metadata as { nombre?: string; full_name?: string } | null

  const usuario: UsuarioShell = {
    // Sin ficha todavía, el nombre sale del metadata del alta y, en última
    // instancia, de la parte local del mail: nunca se muestra vacío.
    nombre:
      profesional?.nombre?.trim() ||
      metadata?.nombre?.trim() ||
      metadata?.full_name?.trim() ||
      email.split('@')[0] ||
      'Sin nombre',
    email,
    matricula: profesional?.matricula ?? null,
    tieneFicha: Boolean(profesional),
  }

  return (
    <div className="min-h-dvh bg-page">
      <Topbar usuario={usuario} />

      <main className="mx-auto w-full max-w-[1180px] px-4 pb-6 pt-5 md:px-8 md:pb-16 md:pt-8">
        {children}
      </main>

      {/* Colchón para que la tabbar y el FAB no tapen el final del contenido. */}
      <div
        aria-hidden
        className="md:hidden"
        style={{ height: 'calc(env(safe-area-inset-bottom, 0px) + 80px)' }}
      />

      <Tabbar />
      <WizardPresupuesto />
    </div>
  )
}
