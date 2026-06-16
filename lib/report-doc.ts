// Shared report document model — the block-based doc the editor composes, the
// public share view renders (<ReportDocView>), the PPTX export maps, and the
// persistence layer stores. Pure & portable (no "use client"/server-only).

export type BlockType = "h1" | "h2" | "text" | "quote" | "kpi" | "list" | "chart" | "table";
export type Block = { id: string; type: BlockType; text: string; value?: string; items?: string[]; rows?: string[][] };
export type ReportDoc = { title: string; subtitle: string; blocks: Block[] };

export const uid = () => Math.random().toString(36).slice(2, 9);

// Seed example report (demo content — like a run's output). Used as the fallback
// when there's no persisted report yet.
export const SEED_DOC: ReportDoc = {
  title: "Cartagena, en el aire de cuatro aerolíneas",
  subtitle: "Benchmark competitivo · ruta Cartagena · Q2 2026",
  blocks: [
    { id: uid(), type: "h1", text: "Resumen ejecutivo" },
    { id: uid(), type: "text", text: "Entre el 1 de marzo y el 30 de abril, las cinco aerolíneas analizadas produjeron 2.418 piezas relacionadas a Cartagena. Avianca concentra el 41,3% del volumen total; Copa lidera en engagement por pieza con un perfil 78% orgánico." },
    { id: uid(), type: "kpi", text: "Share of voice · Avianca", value: "41,3%" },
    { id: uid(), type: "chart", text: "Volumen mensual por competidor" },
    { id: uid(), type: "quote", text: "El volumen de Avianca casi cuadruplica al de Copa, pero su engagement promedio por pieza es sólo 1,8× más alto." },
    { id: uid(), type: "h2", text: "Recomendaciones" },
    { id: uid(), type: "list", text: "", items: ["Activar TikTok orgánico donde LATAM está ausente.", "Sumar 1–2 creativos pagos por semana en Meta.", "Programar las piezas clave de martes a jueves por la mañana."] },
  ],
};
