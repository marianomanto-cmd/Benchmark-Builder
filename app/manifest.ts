import type { MetadataRoute } from 'next'

/**
 * Manifest para el celular del mostrador.
 *
 * La app se usa desde el teléfono todo el día, y sin esto «Agregar a
 * inicio» dejaba un marcador de Safari: barra de direcciones arriba,
 * ícono genérico, y cada apertura arrancando como una pestaña nueva.
 * Con el manifest queda como una app: pantalla completa, el ícono de la
 * marca y dos accesos directos a lo que se hace todo el día.
 *
 * `display: 'standalone'` y no `fullscreen`: la hora y la batería del
 * sistema tienen que seguir a la vista en el mostrador.
 *
 * Ojo: la ruta que sirve esto es `/manifest.webmanifest`, y no lleva
 * extensión de imagen, así que el matcher del proxy la alcanza. Está
 * exceptuada en `PUBLICAS` (`lib/supabase/proxy.ts`): el navegador la
 * pide antes de que haya sesión.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Smile Lab · Presupuestos',
    short_name: 'Presupuestos',
    description:
      'Presupuestos odontológicos: qué queda a cargo del paciente según su obra social, y el seguimiento hasta que el tratamiento se inicia.',
    lang: 'es-AR',
    dir: 'ltr',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    // El fondo de la app (`--color-page`) y el acento de la marca: la
    // pantalla de arranque no tiene que dar un flash blanco.
    background_color: '#F5FBFC',
    theme_color: '#2FA6B4',
    icons: [
      { src: '/icon.svg', type: 'image/svg+xml', sizes: 'any' },
      { src: '/apple-icon.png', type: 'image/png', sizes: '180x180', purpose: 'any' },
      // El launcher de Android recorta el ícono a su forma: la marca
      // está al 72 % del lienzo, así que entra en la zona segura.
      { src: '/apple-icon.png', type: 'image/png', sizes: '180x180', purpose: 'maskable' },
    ],
    // Mantener apretado el ícono: las dos cosas que se hacen sin pensar.
    shortcuts: [
      {
        name: 'Nuevo presupuesto',
        short_name: 'Nuevo',
        description: 'Abrir el wizard de carga',
        url: '/?nuevo=1',
      },
      {
        name: 'Seguimiento',
        short_name: 'Seguimiento',
        description: 'Presupuestos esperando respuesta',
        url: '/pipeline',
      },
    ],
  }
}
