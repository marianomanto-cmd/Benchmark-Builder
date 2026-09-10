/**
 * Plantillas del mensaje de WhatsApp (pantalla 14).
 *
 * Son funciones puras a propósito: el texto que sale del consultorio es
 * parte del producto, no un string suelto adentro de un componente. Acá
 * se puede testear que interpole bien el nombre, el monto y la vigencia
 * sin montar React.
 *
 * Nada de esto lee `process.env` ni la base: todo entra por parámetro.
 */

// La extensión `.ts` es explícita a propósito: el runner nativo de Node
// (type stripping) no resuelve especificadores relativos sin extensión,
// y estas plantillas tienen que poder testearse sin bundler.
import {
  diasHasta,
  fechaLarga,
  matricula as matriculaTexto,
  money,
  nombreDePila,
  telefonoWhatsApp,
} from './formato.ts'

export type PlantillaWhatsApp = 'primer_envio' | 'recordatorio' | 'actualizacion'

export interface OpcionPlantilla {
  id: PlantillaWhatsApp
  etiqueta: string
  /** Ayuda de una línea: cuándo conviene cada una. */
  cuando: string
}

/** El orden es el del segmented control del sheet. */
export const PLANTILLAS: OpcionPlantilla[] = [
  {
    id: 'primer_envio',
    etiqueta: 'Primer envío',
    cuando: 'La primera vez que el paciente recibe este presupuesto.',
  },
  {
    id: 'recordatorio',
    etiqueta: 'Recordatorio',
    cuando: 'Ya lo mandaste y todavía no contestó.',
  },
  {
    id: 'actualizacion',
    etiqueta: 'Actualización',
    cuando: 'Duplicaste con valores de hoy y reemplaza a uno anterior.',
  },
]

export interface DatosMensaje {
  /** Como está en la ficha: puede venir "Apellido, Nombre". */
  pacienteNombre: string
  numero: string
  /** Lo que queda a cargo del paciente, en pesos enteros. */
  montoACargo: number
  /**
   * Si la obra social cubrió algo de este presupuesto.
   *
   * El mensaje afirmaba siempre «ya con la cobertura descontada». A un
   * paciente particular eso le dice que de un precio mayor se le
   * descontó algo, cuando el número que está leyendo es el precio de
   * lista completo. El PDF y el detalle sí lo distinguen —«calculado
   * como particular: no se aplicó cobertura»—, así que el criterio ya
   * existía en el producto: lo que faltaba era que el mensaje lo usara.
   */
  hayCobertura: boolean
  /** `YYYY-MM-DD`. */
  validoHasta: string
  profesionalNombre: string
  profesionalMatricula: string | null
  /** Nombre del consultorio para el pie. Opcional: si falta, no se firma. */
  consultorio?: string | null
}

/** `Dra. Ana Pérez · MP 12345` — la matrícula sólo si está cargada. */
export function firmaProfesional(
  nombre: string,
  matricula: string | null | undefined,
): string {
  const limpio = nombre.trim()
  const mp = matriculaTexto(matricula)
  return mp ? `${limpio} · ${mp}` : limpio
}

/**
 * Cómo se habla de la vigencia según dónde estemos parados hoy.
 * Un presupuesto vencido no se anuncia como vigente: el paciente lo
 * chequea y el consultorio queda mal parado.
 */
export function textoVigencia(validoHasta: string): string {
  const dias = diasHasta(validoHasta)
  const fecha = fechaLarga(validoHasta)

  if (dias < 0) {
    return `Los valores estaban vigentes hasta el ${fecha}, así que puede que haya que revisarlos: decime y te paso el actualizado.`
  }
  if (dias === 0) {
    return `Los valores son válidos hasta hoy, ${fecha}.`
  }
  return `Los valores son válidos hasta el ${fecha}.`
}

function pie(datos: DatosMensaje): string {
  const firma = firmaProfesional(datos.profesionalNombre, datos.profesionalMatricula)
  const consultorio = datos.consultorio?.trim()
  return consultorio ? `${firma}\n${consultorio}` : firma
}

/**
 * Arma el cuerpo del mensaje. El resultado es un borrador: en el sheet
 * se puede editar antes de mandarlo.
 */
export function armarMensaje(plantilla: PlantillaWhatsApp, datos: DatosMensaje): string {
  const nombre = nombreDePila(datos.pacienteNombre)
  const monto = money(datos.montoACargo)
  const vigencia = textoVigencia(datos.validoHasta)
  // Sin cobertura el monto ES el total, y decirlo así es más claro que
  // callarlo: el paciente particular sabe que no hay descuento detrás.
  const conCobertura = datos.hayCobertura
    ? ', ya con la cobertura descontada'
    : ', que es el total del tratamiento'

  const cuerpo: Record<PlantillaWhatsApp, string> = {
    primer_envio: [
      `Hola ${nombre}, ¿cómo estás?`,
      '',
      `Te paso el presupuesto ${datos.numero} de lo que vimos en la consulta. Queda a cargo tuyo ${monto}${conCobertura}.`,
      '',
      `${vigencia} Cualquier duda escribime por acá y lo vemos juntos.`,
    ].join('\n'),

    recordatorio: [
      `Hola ${nombre}, ¿cómo va?`,
      '',
      `Te escribo por el presupuesto ${datos.numero} que te había pasado, para saber si pudiste verlo. Queda a cargo tuyo ${monto}.`,
      '',
      `${vigencia} Si querés arrancar, o si preferís que veamos otra alternativa, decime y lo charlamos sin problema.`,
    ].join('\n'),

    actualizacion: [
      `Hola ${nombre}, ¿cómo estás?`,
      '',
      `Te paso el presupuesto ${datos.numero} con los valores de hoy: reemplaza al que te había mandado antes. Queda a cargo tuyo ${monto}.`,
      '',
      `${vigencia} Si tenías dudas con el anterior, avisame y lo repasamos.`,
    ].join('\n'),
  }

  return `${cuerpo[plantilla]}\n\n${pie(datos)}`
}

/**
 * Pega el link del PDF al final del mensaje ya editado.
 *
 * Va aparte de `armarMensaje` porque el link firmado recién existe al
 * momento de mandar: si estuviera en el borrador, el usuario podría
 * borrarlo sin querer o guardarlo vencido.
 */
export function conLinkPdf(mensaje: string, url: string | null | undefined): string {
  if (!url) return mensaje
  return `${mensaje.trimEnd()}\n\nPresupuesto en PDF: ${url}`
}

/**
 * `https://wa.me/5493510000000?text=...`
 * Devuelve null si el teléfono no alcanza para armar el link.
 */
export function linkWhatsApp(
  telefono: string | null | undefined,
  mensaje: string,
): string | null {
  const numero = telefonoWhatsApp(telefono)
  if (!numero) return null
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`
}

/** `Presupuesto-2026-0341.pdf` — el nombre con el que le llega al paciente. */
export function nombreArchivoPdf(numero: string): string {
  const limpio = numero.trim().replace(/[^\w-]+/g, '-') || 'presupuesto'
  return `Presupuesto-${limpio}.pdf`
}

/**
 * Cómo viajó el presupuesto: adjunto de verdad, como link firmado, o
 * nada. No es lo mismo para el que después lee el historial y quiere
 * saber si el paciente llegó a ver el documento.
 */
export type ModoAdjunto = 'adjunto' | 'link' | 'sin'

const TEXTO_ADJUNTO: Record<ModoAdjunto, string> = {
  adjunto: ' con el PDF adjunto',
  link: ' con el link al PDF',
  sin: ' sin adjunto',
}

/**
 * Texto del evento que queda en el historial. El timeline tiene que
 * poder contar qué plantilla se usó sin abrir el PDF.
 *
 * El modo NO se deduce de tener el archivo preparado: un navegador que
 * no comparte archivos manda el link, y uno sin link manda el texto
 * pelado. Decir "con el PDF adjunto" en esos casos era escribir en un
 * historial append-only algo que no pasó.
 */
export function descripcionEnvio(
  plantilla: PlantillaWhatsApp,
  adjunto: ModoAdjunto,
): string {
  const etiqueta =
    PLANTILLAS.find((p) => p.id === plantilla)?.etiqueta ?? 'Mensaje'
  return `Enviado por WhatsApp · plantilla "${etiqueta}"${TEXTO_ADJUNTO[adjunto]}`
}
