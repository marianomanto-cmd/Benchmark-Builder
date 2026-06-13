import type { ImageAnalysis, Transcript, ConsolidatedMedia, MediaFile } from "./types";

// Deterministic mock analyses (zero cost). Keyed off the media URL so the same
// creative always yields the same analysis. Themed for the demo (airlines).

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const SHOWS = [
  ["avión", "cielo", "atardecer", "logo de aerolínea"],
  ["playa", "Cartagena", "pareja", "sol caribeño"],
  ["tarjeta de embarque", "precio destacado", "CTA de reserva"],
  ["tripulación", "cabina", "servicio a bordo"],
];
const SUMMARIES = [
  "Creativo de marca: un avión sobrevolando Cartagena al atardecer, tono aspiracional.",
  "Pieza de destino: playa caribeña con claim de tarifa promocional.",
  "Anuncio de oferta: una tarifa destacada con llamado a reservar.",
  "Contenido de servicio: tripulación y experiencia a bordo.",
];
const OCR = ["", "DESDE USD 89", "USD 89 · RESERVÁ HOY", ""];
const TRANSCRIPTS = [
  "Volá a Cartagena desde ochenta y nueve dólares. Reservá hoy y viví el Caribe.",
  "Esta temporada descubrí Cartagena con nosotros: vuelos diarios y equipaje incluido.",
  "Tu próxima aventura empieza acá, con tarifas que sí caben en tu bolsillo.",
  "",
];
const TOPICS = [
  ["viajes", "turismo", "tarifas"],
  ["destino", "Caribe", "promoción"],
  ["oferta", "pricing"],
  ["servicio", "experiencia"],
];

export function mockImageAnalysis(f: MediaFile): ImageAnalysis {
  const i = hash(f.url) % SHOWS.length;
  return { summary: SUMMARIES[i], shows: SHOWS[i], ocr_text: OCR[i], sentiment: "pos", brand_safety: "safe", topics: TOPICS[i] };
}

export function mockTranscript(f: MediaFile): Transcript {
  const i = hash(f.url) % TRANSCRIPTS.length;
  return { text: TRANSCRIPTS[i], language: "es" };
}

export function mockConsolidated(f: MediaFile): ConsolidatedMedia {
  const img = mockImageAnalysis(f);
  const tr = mockTranscript(f);
  const kind = f.kind === "video" ? "video" : "image";
  return {
    kind,
    summary: img.summary,
    shows: img.shows,
    ocr_text: img.ocr_text,
    transcript: kind === "video" ? tr.text : "",
    language: kind === "video" && tr.text ? tr.language : "",
    sentiment: img.sentiment,
    brand_safety: img.brand_safety,
    topics: img.topics,
    model: "mock",
  };
}
