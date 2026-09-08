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
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: '#2FA6B4',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
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
        />
      </body>
    </html>
  )
}
