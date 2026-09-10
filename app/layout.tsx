import type { Metadata, Viewport } from 'next'
import { Sora, Manrope } from 'next/font/google'
import { Toaster } from 'sonner'

import { QueryProvider } from '@/components/query-provider'
import './globals.css'

const sora = Sora({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-sora',
  display: 'swap',
})

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-manrope',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Smile Lab · Presupuestos',
    template: '%s · Smile Lab',
  },
  description:
    'Presupuestos odontológicos: qué queda a cargo del paciente según su obra social, y el seguimiento hasta que el tratamiento se inicia.',
  applicationName: 'Presupuestos',
  robots: { index: false, follow: false },
  /*
   * «Agregar a inicio» en el celular del mostrador dejaba un marcador
   * de Safari: barra de direcciones arriba y un ícono genérico. El
   * manifest, el favicon y el ícono de iOS son archivos de convención
   * y Next los engancha solo — `app/manifest.ts`, `app/icon.svg` y
   * `app/apple-icon.png` —; acá va lo que no sale de un archivo.
   */
  appleWebApp: {
    capable: true,
    title: 'Presupuestos',
    // El fondo de la app es claro: la barra de estado tiene que quedar
    // con texto oscuro, no en blanco sobre blanco.
    statusBarStyle: 'default',
  },
  /*
   * iOS convierte solo en links todo lo que le parece un teléfono o una
   * fecha. En un presupuesto eso es la mitad de la pantalla: el número
   * «2026-0341», el DNI, el número de afiliado y los montos quedaban
   * subrayados en azul y abrían el teléfono al tocarlos. Los links de
   * verdad los pone la app.
   */
  formatDetection: { telephone: false, date: false, address: false, email: false },
}

export const viewport: Viewport = {
  themeColor: '#2FA6B4',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  // La paleta es clara y única (no hay tokens dark en `@theme`).
  // Declararlo evita que Chrome de Android le aplique el auto-oscurecido
  // y deje los teal de la marca en un gris sucio.
  colorScheme: 'light',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es-AR" className={`${sora.variable} ${manrope.variable}`}>
      <body>
        <QueryProvider>{children}</QueryProvider>
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              borderRadius: '16px',
              border: '1px solid var(--color-hairline)',
              fontFamily: 'var(--font-sans)',
              fontSize: '13.5px',
              color: 'var(--color-ink)',
              boxShadow: 'var(--shadow-rest)',
            },
          }}
          /*
           * En mobile la tabbar y el FAB viven abajo. Con el offset de
           * 16 px que trae sonner, el toast aparecía justo encima —a
           * veces debajo— de la tabbar, y el «Deshacer» que ofrece el
           * kanban quedaba tapado por el botón de nuevo presupuesto:
           * el atajo para arreglar un arrastre equivocado no se podía
           * tocar. Se sube por arriba de la barra, respetando el
           * safe-area del iPhone. En desktop no hay tabbar y queda el
           * default.
           */
          mobileOffset={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 84px)' }}
        />
      </body>
    </html>
  )
}
