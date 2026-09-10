'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

/**
 * Cuándo tiene sentido volver a preguntar, por tipo de dato.
 *
 * Antes había un solo `staleTime: 30_000` para todo, y eso trata igual
 * a cosas que no lo son: el catálogo de prestaciones no cambia entre
 * paciente y paciente, pero el estado de un presupuesto sí. Con 30
 * segundos, cada apertura del wizard después de un rato volvía a bajar
 * pacientes, prestaciones y obras sociales enteros — cuatro consultas y
 * medio segundo de comboboxes vacíos, con el paciente sentado enfrente.
 */
const MINUTO = 60_000

/**
 * Un error de sesión o de permiso no se arregla reintentando: sólo suma
 * espera antes de mostrar el mensaje. Un corte de red, sí.
 */
function noSirveReintentar(error: unknown): boolean {
  const texto = (error instanceof Error ? error.message : String(error)).toLowerCase()
  return (
    texto.includes('jwt') ||
    texto.includes('no autenticado') ||
    texto.includes('not authenticated') ||
    texto.includes('permission denied') ||
    texto.includes('row-level security') ||
    texto.includes('iniciar sesión')
  )
}

function crearCliente() {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        // El consultorio trabaja con datos que cambian poco durante
        // una sesión: no revalidar en cada foco de ventana.
        staleTime: 30_000,
        gcTime: 10 * MINUTO,
        refetchOnWindowFocus: false,
        // Sí al volver la señal: el celular del mostrador entra y sale
        // del wifi todo el día, y lo que quedó a medias tiene que
        // completarse solo en vez de quedar en un esqueleto eterno.
        refetchOnReconnect: true,
        retry: (fallos, error) => fallos < 2 && !noSirveReintentar(error),
        // 400 ms, 1,2 s: dos intentos rápidos que tapan un bache de
        // señal sin dejar la pantalla colgada.
        retryDelay: (intento) => Math.min(400 * 3 ** intento, 3_000),
      },
      mutations: {
        // Una escritura no se repite sola: podría duplicar un alta.
        retry: false,
      },
    },
  })

  /*
   * Catálogos del wizard (pacientes, profesionales, obras sociales,
   * prestaciones). Se dan de alta desde el propio wizard, y esas altas
   * invalidan la clave a mano, así que un `staleTime` largo no muestra
   * datos viejos: muestra los mismos al instante.
   *
   * El `gcTime` largo es la mitad que importa. El wizard se cierra
   * entre paciente y paciente; con el default de 5 minutos la caché se
   * tiraba justo en ese hueco y el siguiente presupuesto arrancaba
   * cargando de cero.
   */
  client.setQueryDefaults(['wizard'], {
    staleTime: 5 * MINUTO,
    gcTime: 60 * MINUTO,
  })

  // Historial de vigencias de un arancel: es plata, y la grilla lo
  // invalida al cargar una vigencia nueva. Corto y explícito.
  client.setQueryDefaults(['vigencias'], { staleTime: MINUTO })

  // El PDF de un presupuesto emitido es un documento congelado: una vez
  // que se bajó, no hay motivo para volver a pedirlo mientras el sheet
  // esté abierto.
  client.setQueryDefaults(['presupuesto-pdf'], { staleTime: Infinity, gcTime: 5 * MINUTO })

  return client
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(crearCliente)

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
