/**
 * Hoja de estilos del PDF.
 *
 * ── Unidades ────────────────────────────────────────────────────────
 * El sistema de diseño de la app está en px @96dpi; el PDF está en
 * puntos @72dpi. La hoja A4 es la misma en los dos sistemas:
 *
 *     A4 = 210 × 297 mm = 794 × 1123 px @96dpi = 595.28 × 841.89 pt @72dpi
 *
 * O sea: **1 px = 0.75 pt**. Por eso `size="A4"` en `<Page>` y todas
 * las medidas escritas en px del handoff pasan por `px()`, que hace la
 * conversión. Así los números del diseño se leen igual acá que en
 * `globals.css` y no hay que traducirlos a mano.
 *
 * ── Color ───────────────────────────────────────────────────────────
 * El documento tiene **una sola nota de color**: el teal de marca. Se
 * usa en tres lugares y nada más (el logo, la regla del encabezado y
 * el bloque "A cargo del paciente"). Todo lo demás es tinta y grises,
 * que en una láser blanco y negro caen a una escala de grises legible.
 * No hay naranjas ni rojos: la rama "warm" del sistema es de la UI
 * interna, no del documento que ve el paciente.
 */

import { StyleSheet } from '@react-pdf/renderer'

import { FAMILIA_DISPLAY, FAMILIA_TEXTO, PESO_FUERTE, PESO_MEDIO, PESO_NORMAL } from './fuentes'

/** px @96dpi → pt @72dpi. */
export function px(valor: number): number {
  return Math.round(valor * 0.75 * 100) / 100
}

/** Ancho y alto de la hoja en puntos, para documentar la equivalencia. */
export const A4_PT = { ancho: 595.28, alto: 841.89 } as const
/** La misma hoja medida en px @96dpi, que es como está el handoff. */
export const A4_PX = { ancho: 794, alto: 1123 } as const

export const COLOR = {
  /** Única nota de color del documento. */
  primary: '#2FA6B4',
  primaryHover: '#1F8D9B',
  tint: '#EAF8FA',
  ink: '#153A44',
  body: '#334155',
  muted: '#64748B',
  hairline: '#E5EEF0',
  papel: '#FFFFFF',
} as const

/**
 * Escala tipográfica, en px del handoff.
 *
 * Piso duro: **12 px (9 pt)**. Nada del documento baja de ahí, ni las
 * etiquetas en versalitas ni la numeración de páginas: el paciente lo
 * abre en el celular y lo imprime el consultorio, y las dos lecturas
 * tienen que funcionar sin zoom.
 *
 * El número héroe va a 26 px (19.5 pt) y es el total a cargo del
 * paciente: es lo primero que busca cuando abre el archivo.
 */
export const TIPO = {
  hero: px(26),
  titulo: px(17),
  marca: px(17.5),
  seccion: px(13),
  fuerte: px(12.5),
  cuerpo: px(12),
} as const

/** Márgenes de la caja de texto, en px del handoff. */
const MARGEN = {
  superior: px(32),
  lateral: px(48),
  /** Deja lugar al pie fijo con la numeración. */
  inferior: px(62),
} as const

/** Anchos de las columnas numéricas de la tabla, en puntos. */
export const COLUMNA = {
  monto: px(104),
  cobertura: px(118),
  aCargo: px(118),
} as const

export const estilos = StyleSheet.create({
  // ── Página ───────────────────────────────────────────────────────
  pagina: {
    paddingTop: MARGEN.superior,
    paddingBottom: MARGEN.inferior,
    paddingHorizontal: MARGEN.lateral,
    backgroundColor: COLOR.papel,
    fontFamily: FAMILIA_TEXTO,
    fontWeight: PESO_NORMAL,
    fontSize: TIPO.cuerpo,
    lineHeight: 1.45,
    color: COLOR.body,
  },

  // ── Encabezado ───────────────────────────────────────────────────
  encabezado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  marca: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  marcaTexto: {
    marginLeft: px(9),
    fontFamily: FAMILIA_DISPLAY,
    fontWeight: PESO_FUERTE,
    fontSize: TIPO.marca,
    letterSpacing: -0.4,
    color: COLOR.primary,
  },
  consultorio: {
    maxWidth: px(280),
    textAlign: 'right',
    fontSize: TIPO.cuerpo,
    lineHeight: 1.35,
    color: COLOR.muted,
  },
  identificacionDocumento: {
    marginTop: px(16),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  numero: {
    fontFamily: FAMILIA_DISPLAY,
    fontWeight: PESO_FUERTE,
    fontSize: TIPO.titulo,
    letterSpacing: -0.3,
    color: COLOR.ink,
  },
  fechaEmision: {
    fontSize: TIPO.cuerpo,
    color: COLOR.muted,
  },
  /** La regla teal de 2 px del handoff = 1.5 pt. */
  regla: {
    marginTop: px(8),
    height: px(2),
    backgroundColor: COLOR.primary,
  },

  // ── Bloque de identificación ─────────────────────────────────────
  identificacion: {
    marginTop: px(12),
    borderWidth: px(1),
    borderColor: COLOR.hairline,
    borderRadius: px(14),
    paddingVertical: px(9),
    paddingHorizontal: px(16),
  },
  identificacionFila: {
    flexDirection: 'row',
  },
  identificacionColumna: {
    width: '50%',
    paddingRight: px(12),
  },

  // ── Rótulos y textos genéricos ───────────────────────────────────
  rotulo: {
    fontFamily: FAMILIA_TEXTO,
    fontWeight: PESO_FUERTE,
    fontSize: TIPO.cuerpo,
    letterSpacing: 0.7,
    color: COLOR.muted,
  },
  valor: {
    marginTop: px(2),
    fontFamily: FAMILIA_TEXTO,
    fontWeight: PESO_FUERTE,
    fontSize: TIPO.seccion,
    color: COLOR.ink,
  },
  valorSecundario: {
    fontSize: TIPO.cuerpo,
    color: COLOR.body,
  },
  seccion: {
    marginTop: px(12),
  },
  tituloSeccion: {
    fontFamily: FAMILIA_TEXTO,
    fontWeight: PESO_FUERTE,
    fontSize: TIPO.cuerpo,
    letterSpacing: 0.7,
    color: COLOR.muted,
    marginBottom: px(6),
  },
  parrafo: {
    fontSize: TIPO.cuerpo,
    lineHeight: 1.5,
    color: COLOR.body,
  },

  // ── Tabla de prestaciones ────────────────────────────────────────
  tablaCabecera: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderBottomWidth: px(1.5),
    borderBottomColor: COLOR.ink,
    paddingBottom: px(6),
  },
  tablaFila: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderBottomWidth: px(1),
    borderBottomColor: COLOR.hairline,
    paddingVertical: px(6),
  },
  celdaPrestacion: {
    flexGrow: 1,
    flexShrink: 1,
    paddingRight: px(12),
  },
  celdaMonto: {
    width: COLUMNA.monto,
    textAlign: 'right',
  },
  celdaCobertura: {
    width: COLUMNA.cobertura,
    textAlign: 'right',
  },
  celdaACargo: {
    width: COLUMNA.aCargo,
    textAlign: 'right',
  },
  nombrePrestacion: {
    fontFamily: FAMILIA_TEXTO,
    fontWeight: PESO_FUERTE,
    fontSize: TIPO.seccion,
    color: COLOR.ink,
  },
  detallePrestacion: {
    marginTop: px(1),
    fontSize: TIPO.cuerpo,
    lineHeight: 1.4,
    color: COLOR.muted,
  },
  cifra: {
    fontFamily: FAMILIA_TEXTO,
    fontWeight: PESO_MEDIO,
    fontSize: TIPO.fuerte,
    color: COLOR.ink,
  },
  cifraApagada: {
    fontSize: TIPO.cuerpo,
    color: COLOR.muted,
    marginTop: px(2),
  },

  // ── Totales ──────────────────────────────────────────────────────
  bloqueTotales: {
    marginTop: px(8),
    marginLeft: 'auto',
    width: px(330),
  },
  filaTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: px(3),
  },
  etiquetaTotal: {
    flexShrink: 1,
    paddingRight: px(12),
    fontSize: TIPO.cuerpo,
    color: COLOR.body,
  },
  montoTotal: {
    fontFamily: FAMILIA_TEXTO,
    fontWeight: PESO_MEDIO,
    fontSize: TIPO.fuerte,
    color: COLOR.ink,
  },
  cajaACargo: {
    marginTop: px(8),
    backgroundColor: COLOR.tint,
    borderWidth: px(1.5),
    borderColor: COLOR.primary,
    borderRadius: px(14),
    paddingVertical: px(9),
    paddingHorizontal: px(16),
  },
  etiquetaACargo: {
    fontFamily: FAMILIA_TEXTO,
    fontWeight: PESO_FUERTE,
    fontSize: TIPO.cuerpo,
    letterSpacing: 0.7,
    color: COLOR.primaryHover,
  },
  /** Número héroe: 26 px del handoff. */
  montoACargo: {
    marginTop: px(2),
    fontFamily: FAMILIA_DISPLAY,
    fontWeight: PESO_FUERTE,
    fontSize: TIPO.hero,
    letterSpacing: -0.5,
    lineHeight: 1.15,
    color: COLOR.ink,
  },

  /** Condiciones y observaciones conviven en una banda de dos columnas. */
  banda: {
    marginTop: px(12),
    flexDirection: 'row',
  },
  bandaColumna: {
    width: '50%',
  },
  bandaSeparacion: {
    paddingRight: px(24),
  },

  // ── Cuotas ───────────────────────────────────────────────────────
  filaCuota: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: px(1),
    borderBottomColor: COLOR.hairline,
    paddingVertical: px(4),
  },
  etiquetaCuota: {
    flexGrow: 1,
    flexShrink: 1,
    paddingRight: px(12),
    fontSize: TIPO.cuerpo,
    color: COLOR.body,
  },
  porcentajeCuota: {
    width: px(58),
    textAlign: 'right',
    fontSize: TIPO.cuerpo,
    color: COLOR.muted,
  },
  montoCuota: {
    width: px(105),
    textAlign: 'right',
    fontFamily: FAMILIA_TEXTO,
    fontWeight: PESO_MEDIO,
    fontSize: TIPO.fuerte,
    color: COLOR.ink,
  },

  // ── Cierre: disclaimer y firma ───────────────────────────────────
  legales: {
    marginTop: px(12),
    borderTopWidth: px(1),
    borderTopColor: COLOR.hairline,
    paddingTop: px(9),
  },
  legal: {
    fontSize: TIPO.cuerpo,
    lineHeight: 1.4,
    color: COLOR.muted,
    marginBottom: px(4),
  },
  firma: {
    marginTop: px(16),
    marginLeft: 'auto',
    width: px(300),
  },
  lineaFirma: {
    borderTopWidth: px(1),
    borderTopColor: COLOR.ink,
    paddingTop: px(6),
  },
  firmaNombre: {
    textAlign: 'center',
    fontFamily: FAMILIA_TEXTO,
    fontWeight: PESO_FUERTE,
    fontSize: TIPO.cuerpo,
    color: COLOR.ink,
  },
  firmaMatricula: {
    textAlign: 'center',
    fontSize: TIPO.cuerpo,
    color: COLOR.muted,
  },

  // ── Pie fijo ─────────────────────────────────────────────────────
  pie: {
    position: 'absolute',
    bottom: px(24),
    left: MARGEN.lateral,
    right: MARGEN.lateral,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: px(1),
    borderTopColor: COLOR.hairline,
    paddingTop: px(8),
  },
  pieTexto: {
    fontSize: TIPO.cuerpo,
    color: COLOR.muted,
  },
})
