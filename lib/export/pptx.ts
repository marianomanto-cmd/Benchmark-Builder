import pptxgen from "pptxgenjs";
import type { ReportDoc } from "@/lib/report-doc";

// Export the report Doc to a real, editable .pptx (native text, tables and a
// native bar chart — NOT images), client-side and zero-cost. Opens in PowerPoint
// and, via import, in Google Slides. White-label aware via `opts` (task 6).
// PPTX can't embed our web fonts → serif maps to Georgia, sans to Calibri, mono
// to Consolas.

export type PptxBranding = { brandName?: string; accentHex?: string; clientName?: string; showPhatia?: boolean };

const SERIF = "Georgia";
const SANS = "Calibri";
const MONO = "Consolas";
const INK = "1B1A22";
const MUTED = "6B6675";
const FAINT = "9A95A3";
const LINE = "E4E0D9";
// Bar palette (ink → sand) + accent last, mirrors the report's legend.
const SERIES = ["1B1A22", "4A4654", "8C8696", "C9C3B8"];

const PAGE_W = 13.333;
const MX = 0.7;
const CW = PAGE_W - MX * 2;
const Y_TOP = 1.5;
const Y_MAX = 6.9;

type Ctx = { slide: pptxgen.Slide; y: number; title: string };

export async function buildPptx(doc: ReportDoc, opts: PptxBranding = {}): Promise<Blob> {
  const accent = (opts.accentHex || "C1123F").replace("#", "");
  const brand = opts.brandName || "Phatia";
  const showPhatia = opts.showPhatia !== false;
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = brand;
  pptx.company = brand;

  const footer = (slide: pptxgen.Slide) => {
    if (opts.clientName) slide.addText(`Preparado para ${opts.clientName}`, { x: MX, y: 7.05, w: CW * 0.6, h: 0.3, fontFace: MONO, fontSize: 8, color: FAINT });
    if (showPhatia) slide.addText("Generado con Phatia", { x: MX + CW * 0.6, y: 7.05, w: CW * 0.4, h: 0.3, fontFace: MONO, fontSize: 8, color: FAINT, align: "right" });
  };

  // ---- cover ----
  const cover = pptx.addSlide();
  cover.background = { color: "FFFFFF" };
  cover.addShape(pptx.ShapeType.rect, { x: MX, y: 1.5, w: 0.12, h: 0.9, fill: { color: accent } });
  cover.addText(brand.toUpperCase(), { x: MX, y: 0.7, w: CW, h: 0.4, fontFace: MONO, fontSize: 12, color: accent, charSpacing: 3, bold: true });
  cover.addText(doc.title, { x: MX + 0.35, y: 1.5, w: CW - 0.35, h: 1.9, fontFace: SERIF, fontSize: 40, color: INK, bold: false, valign: "top" });
  cover.addText(doc.subtitle, { x: MX + 0.35, y: 3.5, w: CW - 0.35, h: 0.5, fontFace: MONO, fontSize: 13, color: MUTED });
  if (opts.clientName) cover.addText(`Preparado para ${opts.clientName} · uso interno`, { x: MX + 0.35, y: 4.1, w: CW - 0.35, h: 0.4, fontFace: MONO, fontSize: 11, color: FAINT });
  if (showPhatia) cover.addText("Generado con Phatia", { x: MX, y: 7.05, w: CW, h: 0.3, fontFace: MONO, fontSize: 9, color: FAINT, align: "right" });

  let ctx: Ctx | null = null;

  function newSection(title: string): Ctx {
    const slide = pptx.addSlide();
    slide.background = { color: "FFFFFF" };
    slide.addShape(pptx.ShapeType.rect, { x: MX, y: 0.6, w: 0.5, h: 0.06, fill: { color: accent } });
    slide.addText(title || " ", { x: MX, y: 0.75, w: CW, h: 0.7, fontFace: SERIF, fontSize: 26, color: INK, valign: "top" });
    footer(slide);
    return { slide, y: Y_TOP, title };
  }
  function ensure(h: number): Ctx {
    if (!ctx) ctx = newSection("");
    if (ctx.y + h > Y_MAX) ctx = newSection(`${ctx.title}${ctx.title ? " (cont.)" : ""}`);
    return ctx;
  }

  for (const b of doc.blocks) {
    if (b.type === "h1" || b.type === "h2") {
      ctx = newSection(b.text);
      continue;
    }
    if (b.type === "text") {
      const h = Math.max(0.5, Math.ceil(b.text.length / 95) * 0.32 + 0.2);
      const c = ensure(h);
      c.slide.addText(b.text, { x: MX, y: c.y, w: CW, h, fontFace: SERIF, fontSize: 15, color: INK, valign: "top", fit: "shrink" });
      c.y += h + 0.12;
    } else if (b.type === "quote") {
      const h = Math.max(0.6, Math.ceil(b.text.length / 80) * 0.34 + 0.3);
      const c = ensure(h);
      c.slide.addShape(pptx.ShapeType.rect, { x: MX, y: c.y, w: 0.06, h, fill: { color: accent } });
      c.slide.addText(b.text, { x: MX + 0.25, y: c.y, w: CW - 0.25, h, fontFace: SERIF, italic: true, fontSize: 17, color: INK, valign: "top", fit: "shrink" });
      c.y += h + 0.14;
    } else if (b.type === "kpi") {
      const h = 1.0;
      const c = ensure(h);
      c.slide.addShape(pptx.ShapeType.roundRect, { x: MX, y: c.y, w: CW, h, fill: { color: "F7F4EF" }, line: { color: LINE, width: 1 }, rectRadius: 0.06 });
      c.slide.addText(b.value || "", { x: MX + 0.25, y: c.y + 0.12, w: 3, h: 0.76, fontFace: MONO, fontSize: 34, bold: true, color: accent, valign: "middle" });
      c.slide.addText(b.text, { x: MX + 3.3, y: c.y + 0.12, w: CW - 3.6, h: 0.76, fontFace: SANS, fontSize: 14, color: MUTED, valign: "middle" });
      c.y += h + 0.16;
    } else if (b.type === "list") {
      const items = b.items ?? [];
      const h = Math.max(0.4, items.length * 0.36 + 0.1);
      const c = ensure(h);
      c.slide.addText(items.map((it) => ({ text: it, options: { bullet: { code: "2022" }, fontFace: SANS, fontSize: 14, color: INK, paraSpaceAfter: 6 } })), { x: MX + 0.1, y: c.y, w: CW - 0.1, h, valign: "top" });
      c.y += h + 0.12;
    } else if (b.type === "table") {
      const rows = b.rows ?? [];
      const h = Math.max(0.4, rows.length * 0.4 + 0.1);
      const c = ensure(h);
      const tableRows = rows.map((r, ri) =>
        r.map((cell) => ({ text: cell, options: { fontFace: ri === 0 ? SANS : SANS, bold: ri === 0, fontSize: 12, color: INK, fill: { color: ri === 0 ? "F2EEE7" : "FFFFFF" }, valign: "middle" as const } })),
      );
      c.slide.addTable(tableRows, { x: MX, y: c.y, w: CW, border: { type: "solid", color: LINE, pt: 1 }, autoPage: false });
      c.y += h + 0.16;
    } else if (b.type === "chart") {
      const h = 3.3;
      const c = ensure(h + 0.4);
      c.slide.addText(b.text, { x: MX, y: c.y, w: CW, h: 0.35, fontFace: SERIF, fontSize: 14, color: MUTED });
      c.slide.addChart(
        pptx.ChartType.bar,
        [{ name: "Share of voice", labels: ["Avianca", "LATAM", "Wingo", "Arajet", "Copa"], values: [41.3, 24, 12.9, 11.9, 9.9] }],
        { x: MX, y: c.y + 0.4, w: CW, h, barDir: "col", showLegend: false, showValue: true, chartColors: [...SERIES, accent], valAxisHidden: true, catAxisLabelColor: MUTED, dataLabelColor: INK, dataLabelFontFace: MONO, dataLabelFontSize: 10 },
      );
      c.y += h + 0.5;
    }
  }

  return (await pptx.write({ outputType: "blob" })) as Blob;
}

// Build + trigger a browser download.
export async function exportPptx(doc: ReportDoc, fileName = "phatia-reporte.pptx", opts: PptxBranding = {}): Promise<void> {
  const blob = await buildPptx(doc, opts);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
