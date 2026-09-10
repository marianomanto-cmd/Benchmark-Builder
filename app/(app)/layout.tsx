import { redirect } from 'next/navigation'

import { Tabbar } from '@/components/shell/tabbar'
import { Topbar } from '@/components/shell/topbar'
import { WizardPresupuesto } from '@/components/wizard/wizard-presupuesto'
import { getPerfil } from '@/lib/supabase/server'

/**
 * Shell de la app con sesión.
 *
 * El chequeo del `proxy` es optimista (sólo mira la cookie); acá se
 * verifica de verdad contra Supabase antes de renderizar nada.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const perfil = await getPerfil()
  if (!perfil) redirect('/login')

  return (
    <div className="min-h-dvh bg-page">
      <Topbar perfil={perfil} />

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
