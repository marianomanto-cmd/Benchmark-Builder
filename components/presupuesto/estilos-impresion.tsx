/**
 * Cómo sale el detalle cuando alguien lo manda a imprimir desde el
 * navegador (Ctrl+P), que es lo que pasa cuando el paciente quiere el
 * papel en el momento y el PDF tarda o el teléfono no está a mano.
 *
 * `globals.css` sólo trae `.no-print` y el fondo blanco: alcanza para
 * que no se imprima la barra flotante, pero el papel salía con la
 * topbar, el FAB, los botones, la columna de seguimiento y las notas
 * internas —que por definición NO se le muestran al paciente, igual que
 * en el PDF—. Además, a 190 mm de ancho el `md:` de Tailwind no llega a
 * activarse, así que se imprimían las cards de mobile en vez de la
 * tabla.
 *
 * Las reglas viven acá y no en `globals.css` porque son de esta
 * pantalla: el `<style>` se monta sólo con el detalle en el árbol.
 */
const CSS = `
@media print {
  /* ── El chrome de la app no va al papel ─────────────────── */
  .no-print,
  header.sticky,
  nav[aria-label="Navegación principal"],
  button[aria-label="Nuevo presupuesto"],
  .detalle-presupuesto button {
    display: none !important;
  }

  /* ── Una sola columna, y la tabla en vez de las cards ───── */
  .detalle-columnas { display: block !important; }
  .prestaciones-tabla { display: block !important; }
  .prestaciones-cards,
  .cabecera-hero { display: none !important; }

  /* ── Tinta: sin sombras, con los bordes finos que quedan ── */
  .detalle-presupuesto .surface,
  .detalle-presupuesto section {
    box-shadow: none !important;
  }

  /* ── Nada se corta al medio si se puede evitar ──────────── */
  .detalle-presupuesto section,
  .detalle-presupuesto tr,
  .detalle-presupuesto li {
    break-inside: avoid;
  }

  .detalle-presupuesto h1 { break-after: avoid; }
}
`

export function EstilosImpresion() {
  return (
    <style href="detalle-presupuesto-impresion" precedence="medium">
      {CSS}
    </style>
  )
}
