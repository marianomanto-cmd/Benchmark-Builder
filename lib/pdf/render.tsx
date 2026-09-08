import 'server-only'

import { renderToBuffer } from '@react-pdf/renderer'

import type { DatosPdf } from './datos'
import { DocumentoPresupuesto } from './documento'

/**
 * Renderiza el presupuesto a bytes.
 *
 * Corre sólo en Node (`renderToBuffer` usa pdfkit y fontkit, que leen
 * el filesystem). La route del PDF declara `runtime = 'nodejs'` por eso
 * mismo, y `next.config.ts` deja `@react-pdf/renderer` fuera del bundle
 * del server.
 */
export async function renderizarPresupuesto(datos: DatosPdf): Promise<Buffer> {
  return renderToBuffer(<DocumentoPresupuesto datos={datos} />)
}
