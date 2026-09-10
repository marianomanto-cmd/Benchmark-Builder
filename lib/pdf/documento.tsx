/**
 * Pantalla 13 · El PDF del presupuesto.
 *
 * Hoja A4 (`size="A4"` = 595.28 × 841.89 pt = 794 × 1123 px @96dpi; ver
 * `estilos.ts` para la conversión px → pt).
 *
 * Orden del documento:
 *   1. Encabezado con logo, datos del consultorio, número y fecha,
 *      apoyado sobre una regla teal de 2 px.
 *   2. Identificación en dos columnas: paciente, obra social,
 *      profesional y validez.
 *   3. Tabla de prestaciones, con la descripción del snapshot.
 *   4. Totales a la derecha, con el a-cargo como número héroe.
 *   5. Condiciones de pago y observaciones.
 *   6. Cierre: vigencia, cobertura, firma, y pie con numeración.
 *
 * Lo que **no** sale nunca: el chip `editado`, el motivo del override,
 * la cobertura original y la nota interna. Los overrides son una
 * decisión del consultorio, no parte del documento del paciente. El
 * tipo `DatosPdf` directamente no los tiene.
 */

import { Circle, Document, Page, Path, Rect, Svg, Text, View } from '@react-pdf/renderer'

import { fechaLarga, matricula, money, porcentaje } from '@/lib/formato'

import { lineasContacto } from './consultorio'
import type { DatosPdf, ItemPdf } from './datos'
import { COLOR, estilos, px } from './estilos'
import { registrarFuentes } from './fuentes'

/**
 * A partir de acá el cierre no entra abajo de la tabla sin quedar
 * partido. Totales y firma se van enteros a la página siguiente: un
 * total a cargo cortado al medio de la hoja es exactamente lo que hace
 * que el paciente vuelva a preguntar cuánto tiene que pagar.
 */
export const MAXIMO_ITEMS_PRIMERA_PAGINA = 8

/** Marca del consultorio: la misma del logo de la app, en una nota de color. */
function Marca({ nombre }: { nombre: string }) {
  return (
    <View style={estilos.marca}>
      <Svg width={px(28)} height={px(32)} viewBox="0 0 28 32">
        <Rect x={0} y={2} width={28} height={28} rx={9} fill={COLOR.primary} />
        <Path
          d="M8.6 15.4c0 3.2 2.4 5.8 5.4 5.8s5.4-2.6 5.4-5.8"
          stroke="#FFFFFF"
          strokeWidth={2.6}
          strokeLinecap="round"
          fill="none"
        />
        <Circle cx={10.9} cy={11.3} r={1.55} fill="#FFFFFF" />
        <Circle cx={17.1} cy={11.3} r={1.55} fill="#FFFFFF" />
      </Svg>
      <Text style={estilos.marcaTexto}>{nombre}</Text>
    </View>
  )
}

/**
 * Un dato del bloque de identificación. El secundario va en la misma
 * línea, en gris: son dos líneas por campo en vez de tres, y eso es lo
 * que permite que un presupuesto corriente entre entero en una hoja.
 */
function Campo({
  rotulo,
  valor,
  secundario,
}: {
  rotulo: string
  valor: string
  secundario?: string | null
}) {
  return (
    <View>
      <Text style={estilos.rotulo}>{rotulo}</Text>
      <Text style={estilos.valor}>
        {valor}
        {secundario ? (
          <Text style={estilos.valorSecundario}>{`  ·  ${secundario}`}</Text>
        ) : null}
      </Text>
    </View>
  )
}

/**
 * Cómo se cuenta la cobertura de una línea. El monto en pesos es lo que
 * importa; el porcentaje va debajo porque es lo que el paciente
 * chequea contra su credencial.
 */
function coberturaDeItem(item: ItemPdf): { monto: string; nota: string | null } {
  if (item.coberturaTipo === 'ninguna' || item.coberturaMonto <= 0) {
    return { monto: '—', nota: null }
  }
  return {
    monto: money(item.coberturaMonto),
    nota: item.coberturaTipo === 'porcentaje' ? porcentaje(item.coberturaValor) : 'Monto fijo',
  }
}

/** Segunda línea de la celda de prestación: el detalle y el código. */
function detalleDeItem(item: ItemPdf): string | null {
  const partes = [item.detalle, item.codigo ? `Cód. ${item.codigo}` : null].filter(Boolean)
  return partes.length > 0 ? partes.join(' · ') : null
}

function FilaPrestacion({ item }: { item: ItemPdf }) {
  const cobertura = coberturaDeItem(item)
  const detalle = detalleDeItem(item)

  return (
    <View style={estilos.tablaFila} wrap={false}>
      <View style={estilos.celdaPrestacion}>
        <Text style={estilos.nombrePrestacion}>{item.nombre}</Text>
        {item.descripcion ? (
          <Text style={estilos.detallePrestacion}>{item.descripcion}</Text>
        ) : null}
        {detalle ? <Text style={estilos.detallePrestacion}>{detalle}</Text> : null}
      </View>
      <View style={estilos.celdaMonto}>
        <Text style={estilos.cifra}>{money(item.monto)}</Text>
      </View>
      <View style={estilos.celdaCobertura}>
        <Text style={estilos.cifra}>{cobertura.monto}</Text>
        {cobertura.nota ? <Text style={estilos.cifraApagada}>{cobertura.nota}</Text> : null}
      </View>
      <View style={estilos.celdaACargo}>
        <Text style={estilos.cifra}>{money(item.aCargo)}</Text>
      </View>
    </View>
  )
}

function Totales({ datos }: { datos: DatosPdf }) {
  const etiquetaCobertura = datos.obraSocial
    ? `Cobertura ${datos.obraSocial}`
    : 'Cobertura'

  return (
    <View style={estilos.bloqueTotales}>
      <View style={estilos.filaTotal}>
        <Text style={estilos.etiquetaTotal}>Subtotal de prestaciones</Text>
        <Text style={estilos.montoTotal}>{money(datos.subtotal)}</Text>
      </View>
      <View style={estilos.filaTotal}>
        <Text style={estilos.etiquetaTotal}>{etiquetaCobertura}</Text>
        <Text style={estilos.montoTotal}>
          {datos.totalCobertura > 0 ? `− ${money(datos.totalCobertura)}` : money(0)}
        </Text>
      </View>

      {/* La única superficie de color del documento, y el número héroe. */}
      <View style={estilos.cajaACargo}>
        <Text style={estilos.etiquetaACargo}>A CARGO DEL PACIENTE</Text>
        <Text style={estilos.montoACargo}>{money(datos.totalACargo)}</Text>
      </View>
    </View>
  )
}

function CondicionesDePago({ datos }: { datos: DatosPdf }) {
  return (
    <View>
      <Text style={estilos.tituloSeccion}>CONDICIONES DE PAGO</Text>
      {datos.cuotas.length === 0 ? (
        <Text style={estilos.parrafo}>
          Se acuerdan al momento de iniciar el tratamiento. Consultanos por las
          formas de pago disponibles.
        </Text>
      ) : (
        datos.cuotas.map((cuota, i) => (
          <View key={`${cuota.etiqueta}-${i}`} style={estilos.filaCuota}>
            <Text style={estilos.etiquetaCuota}>{cuota.etiqueta}</Text>
            <Text style={estilos.porcentajeCuota}>
              {cuota.porcentaje === null ? '' : porcentaje(cuota.porcentaje)}
            </Text>
            <Text style={estilos.montoCuota}>{money(cuota.monto)}</Text>
          </View>
        ))
      )}
    </View>
  )
}

/**
 * Condiciones de pago y observaciones comparten una banda de dos
 * columnas: son dos bloques cortos y apilados dejaban media hoja
 * vacía, que es lo que empujaba la firma a una segunda página en
 * presupuestos chicos. Sin observaciones, las condiciones ocupan todo
 * el ancho.
 */
function CondicionesYObservaciones({ datos }: { datos: DatosPdf }) {
  if (!datos.observaciones) {
    return (
      <View style={estilos.seccion}>
        <CondicionesDePago datos={datos} />
      </View>
    )
  }

  return (
    <View style={estilos.banda}>
      <View style={[estilos.bandaColumna, estilos.bandaSeparacion]}>
        <CondicionesDePago datos={datos} />
      </View>
      <View style={estilos.bandaColumna}>
        <Text style={estilos.tituloSeccion}>OBSERVACIONES</Text>
        <Text style={estilos.parrafo}>{datos.observaciones}</Text>
      </View>
    </View>
  )
}

/** Vigencia, alcance de la cobertura y firma: el cierre del documento. */
function Cierre({ datos }: { datos: DatosPdf }) {
  const textoCobertura = datos.obraSocial
    ? `La cobertura de ${datos.obraSocial} es la vigente al emitirse este presupuesto y queda sujeta a la autorización de la obra social: si autoriza menos, la diferencia queda a cargo del paciente.`
    : 'Presupuesto calculado como particular: no se aplicó cobertura de ninguna obra social.'

  return (
    <View style={estilos.legales}>
      <Text style={estilos.legal}>
        {`Los valores son los vigentes al ${fechaLarga(datos.fechaEmision)} y se mantienen hasta el ${fechaLarga(datos.validoHasta)}. Pasada esa fecha, pedinos uno actualizado. Incluye únicamente las prestaciones detalladas: todo tratamiento que surja durante la atención se presupuesta aparte.`}
      </Text>
      <Text style={estilos.legal}>{textoCobertura}</Text>

      <View style={estilos.firma}>
        <View style={estilos.lineaFirma}>
          <Text style={estilos.firmaNombre}>{datos.profesionalNombre}</Text>
          {datos.profesionalMatricula ? (
            <Text style={estilos.firmaMatricula}>{matricula(datos.profesionalMatricula)}</Text>
          ) : null}
        </View>
      </View>
    </View>
  )
}

export function DocumentoPresupuesto({ datos }: { datos: DatosPdf }) {
  // Idempotente: registra las fuentes de marca la primera vez y no hace
  // nada las siguientes.
  registrarFuentes()

  const contacto = lineasContacto(datos.consultorio)
  const quiebreAntesDelCierre = datos.items.length > MAXIMO_ITEMS_PRIMERA_PAGINA

  return (
    <Document
      title={`Presupuesto ${datos.numero} · ${datos.pacienteNombre}`}
      author={datos.consultorio.nombre}
      creator={datos.consultorio.nombre}
      producer={datos.consultorio.nombre}
      subject={`Presupuesto odontológico ${datos.numero}`}
      language="es-AR"
    >
      <Page size="A4" style={estilos.pagina} wrap>
        {/* ── 1 · Encabezado ─────────────────────────────────────── */}
        <View style={estilos.encabezado}>
          <Marca nombre={datos.consultorio.nombre} />
          <View style={estilos.consultorio}>
            {contacto.map((linea, i) => (
              <Text key={i}>{linea}</Text>
            ))}
          </View>
        </View>

        <View style={estilos.identificacionDocumento}>
          <View>
            <Text style={estilos.rotulo}>PRESUPUESTO</Text>
            <Text style={estilos.numero}>{`N.º ${datos.numero}`}</Text>
          </View>
          <Text style={estilos.fechaEmision}>
            {`Emitido el ${fechaLarga(datos.fechaEmision)}`}
          </Text>
        </View>

        <View style={estilos.regla} />

        {/* ── 2 · Identificación ─────────────────────────────────── */}
        <View style={estilos.identificacion}>
          <View style={estilos.identificacionFila}>
            <View style={estilos.identificacionColumna}>
              <Campo
                rotulo="PACIENTE"
                valor={datos.pacienteNombre}
                secundario={datos.pacienteDni ? `DNI ${datos.pacienteDni}` : null}
              />
            </View>
            <View style={estilos.identificacionColumna}>
              {/* Sin obra social el paciente es particular, y se dice así.
                  Los datos que faltan no se anuncian: el documento del
                  paciente no es el lugar para señalar huecos de la ficha. */}
              <Campo
                rotulo="OBRA SOCIAL"
                valor={datos.obraSocial ?? 'Particular'}
                secundario={
                  datos.obraSocial && datos.nroAfiliado
                    ? `Afiliado ${datos.nroAfiliado}`
                    : null
                }
              />
            </View>
          </View>

          <View style={[estilos.identificacionFila, { marginTop: px(10) }]}>
            <View style={estilos.identificacionColumna}>
              <Campo
                rotulo="PROFESIONAL"
                valor={datos.profesionalNombre}
                secundario={matricula(datos.profesionalMatricula)}
              />
            </View>
            <View style={estilos.identificacionColumna}>
              <Campo rotulo="VÁLIDO HASTA" valor={fechaLarga(datos.validoHasta)} />
            </View>
          </View>
        </View>

        {/* ── 3 · Prestaciones ───────────────────────────────────── */}
        <View style={estilos.seccion}>
          <Text style={estilos.tituloSeccion}>PRESTACIONES</Text>

          <View style={estilos.tablaCabecera} fixed>
            <Text style={[estilos.rotulo, estilos.celdaPrestacion]}>DETALLE</Text>
            <Text style={[estilos.rotulo, estilos.celdaMonto]}>MONTO</Text>
            <Text style={[estilos.rotulo, estilos.celdaCobertura]}>COBERTURA</Text>
            <Text style={[estilos.rotulo, estilos.celdaACargo]}>A CARGO</Text>
          </View>

          {datos.items.map((item, i) => (
            <FilaPrestacion key={`${item.nombre}-${i}`} item={item} />
          ))}
        </View>

        {/* ── 4, 5 y 6 · Cierre ──────────────────────────────────────
            Totales, condiciones y firma viajan juntos y sin partirse:
            `wrap={false}`. Con más de 8 prestaciones ya no entran abajo
            de la tabla, así que arrancan página nueva. */}
        <View wrap={false} break={quiebreAntesDelCierre}>
          <Totales datos={datos} />
          <CondicionesYObservaciones datos={datos} />
          <Cierre datos={datos} />
        </View>

        {/* Pie fijo: se repite en todas las páginas. */}
        <View style={estilos.pie} fixed>
          <Text style={estilos.pieTexto}>
            {`${datos.consultorio.nombre} · Presupuesto N.º ${datos.numero}`}
          </Text>
          <Text
            style={estilos.pieTexto}
            render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
            fixed
          />
        </View>
      </Page>
    </Document>
  )
}
