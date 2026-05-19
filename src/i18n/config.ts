/**
 * i18n config — handoff §10.
 * Estructura desde Fase 1; traducciones se agregan en Fase 4.
 * Toda string user-facing pasa por t('clave'). Hoy sólo es-AR.
 */

export const locales = ["es-AR"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "es-AR";
