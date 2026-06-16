import type { CompetitorVM, MentionVM, InsightVM, AnalysisVM, RunVM } from "@/lib/view-models";
import { sparkFor } from "@/lib/view-models";
import type { PlatformKey, SentimentKind, ThumbKind } from "@/lib/platforms";
import { DEMO_MENTIONS, DEMO_INSIGHTS, DEMO_ANALYSIS_BY_SECTION } from "@/lib/demo";

// ---------------------------------------------------------------------------
// Multi-case demo registry. Every seed run/project maps to a `slug` here, so
// opening a run shows ITS brands, mentions, comparativa, gallery and FODA —
// not always the Copa case. Deterministic + zero-cost (mock fallback).
// ---------------------------------------------------------------------------

const pic = (s: string) => `https://picsum.photos/seed/bb-${s}/600/600`;
const gpic = (s: string) => `https://picsum.photos/seed/bb-${s}/600/750`;
// Short, light sample clips (~2 MB each), remote — autoplay-on-scroll in the
// gallery/feed thumbs (see components/domain.tsx AutoVideo). No repo footprint.
const VID = [
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
];
// Pick a clip deterministically per brand so different brands show different videos.
function vidFor(name: string, k: number): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return VID[(Math.abs(h) + k) % VID.length];
}

const RIVAL_ACCENTS = ["var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--series-4)"];

// es-AR number helpers
function fmtInt(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
function fmtK(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(".", ",") + "M";
  if (n >= 1_000) return Math.round(n / 1_000) + "k";
  return String(Math.round(n));
}
function spendLabel(s: [number, number] | null): string {
  return s ? `USD ${s[0]}–${s[1]}k` : "—";
}
function seedOf(name: string): string {
  return name.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "").slice(0, 8) || "x";
}

type Brand = {
  name: string;
  handle: string;
  letter: string;
  isClient?: boolean;
  platforms: PlatformKey[];
  mentions: number;
  sov: number;
  sentiment: SentimentKind;
  eng: number;
  reach: number;
  spend: [number, number] | null;
  top: string;
  freq: number;
  ads: number;
  organic: number;
};

type Strategy = {
  S: string[]; W: string[]; O: string[]; T: string[];
  act: string[]; wait: string[]; react: string[]; fallback: string[];
  short: string[]; mid: string[]; long: string[];
};

type CaseDef = {
  slug: string;
  project: string;
  category: string;
  crumb: string; // breadcrumb middle segment, e.g. "Cartagena · Q2 2026"
  geo: string[];
  runNumber: number;
  cost: number;
  hero: { title: string; titleEm: string; subtitle: string };
  brands: Brand[];
  insights: InsightVM[];
  mentions: MentionVM[];
  analysis: AnalysisVM;
  sections?: Record<string, AnalysisVM>;
  strategy: Strategy;
  radar?: RadarVM; // optional override; otherwise derived from brands
};

// ---- presentation types consumed by the screens ----
export type CompCol = { name: string; brand: string; accent: string; isClient: boolean };
export type RowFmt = "mono" | "bar" | "plats" | "sent" | "text";
export type CompRow = { label: string; vals: (string | number)[]; fmt: RowFmt };
export type GalleryItem = [ThumbKind, PlatformKey, string, string[], boolean?, string?, string?];
export type GalleryGroup = { name: string; count: number; items: GalleryItem[] };
export type Quad = { key: string; title: string; tone: string; items: string[] };
export type Move = { key: string; title: string; sub: string; color: string; items: string[] };
export type Horizon = { title: string; window: string; items: string[] };
export type KpiVM = { label: string; value: string; delta?: string; up?: boolean; spark?: boolean; bar?: number; tone?: "ink" };
export type RadarVM = { axes: string[]; series: { name: string; color: string; vals: number[] }[] };

export type ResolvedCase = {
  slug: string;
  project: string;
  crumb: string;
  runNumber: number;
  competitors: CompetitorVM[];
  insights: InsightVM[];
  mentions: MentionVM[];
  run: RunVM;
  hero: { title: string; titleEm: string; subtitle: string };
  kpis: KpiVM[];
  comparativa: { cols: CompCol[]; rows: CompRow[]; platsByCol: PlatformKey[][] };
  gallery: { adGroups: GalleryGroup[]; organicGroups: GalleryGroup[]; adTotal: number; adSpend: string; organicTotal: number };
  swot: { swot: Quad[]; matrix: Move[]; plan: Horizon[]; radar: RadarVM };
  sections: Record<string, AnalysisVM>;
  analysis: AnalysisVM;
};

function accentsOf(brands: Brand[]): string[] {
  let r = 0;
  // Client highlighted with the data-viz accent (gold) — coherent with charts, no coral.
  return brands.map((b) => (b.isClient ? "var(--viz-accent)" : RIVAL_ACCENTS[r++ % RIVAL_ACCENTS.length]));
}

function buildCompetitors(brands: Brand[]): CompetitorVM[] {
  const acc = accentsOf(brands);
  return brands.map((b, i) => ({
    name: b.name,
    handle: b.handle,
    brandLetter: b.letter,
    accent: acc[i],
    isClient: !!b.isClient,
    platforms: b.platforms,
    mentions: String(b.mentions),
    sov: b.sov.toFixed(1).replace(".", ","),
    sentiment: b.sentiment,
    sparkData: sparkFor(i),
  }));
}

function buildKpis(brands: Brand[]): KpiVM[] {
  const client = brands.find((b) => b.isClient) ?? brands[0];
  const totMent = brands.reduce((a, b) => a + b.mentions, 0);
  const totEng = brands.reduce((a, b) => a + b.eng, 0);
  const spHigh = brands.reduce((a, b) => a + (b.spend ? b.spend[1] : 0), 0);
  return [
    { label: "Menciones · 60d", value: fmtInt(totMent), delta: "+12,4%", up: true, spark: true },
    { label: "Engagement total", value: fmtK(totEng), delta: "+8,1%", up: true, spark: true },
    { label: "Share of voice · cliente", value: `${client.sov.toFixed(1).replace(".", ",")}%`, tone: "ink", bar: client.sov },
    { label: "Inversión paga estimada", value: spHigh ? `USD ${spHigh}k` : "—", delta: "+34%", up: true, spark: true },
  ];
}

function buildComparativa(brands: Brand[]) {
  const acc = accentsOf(brands);
  const cols: CompCol[] = brands.map((b, i) => ({ name: b.name, brand: b.letter, accent: acc[i], isClient: !!b.isClient }));
  const rows: CompRow[] = [
    { label: "Menciones · 60d", vals: brands.map((b) => fmtInt(b.mentions)), fmt: "mono" },
    { label: "Engagement total", vals: brands.map((b) => fmtK(b.eng)), fmt: "mono" },
    { label: "Reach estimado", vals: brands.map((b) => fmtK(b.reach)), fmt: "mono" },
    { label: "Share of voice", vals: brands.map((b) => `${b.sov.toFixed(1).replace(".", ",")}%`), fmt: "bar" },
    { label: "Plataformas activas", vals: brands.map((b) => b.platforms.length), fmt: "plats" },
    { label: "Sentimiento dominante", vals: brands.map((b) => b.sentiment), fmt: "sent" },
    { label: "Inversión paga · est.", vals: brands.map((b) => spendLabel(b.spend)), fmt: "mono" },
    { label: "Top contenido", vals: brands.map((b) => b.top), fmt: "text" },
    { label: "Frecuencia · post/sem", vals: brands.map((b) => b.freq.toFixed(1).replace(".", ",")), fmt: "mono" },
  ];
  return { cols, rows, platsByCol: brands.map((b) => b.platforms) };
}

function adItems(b: Brand): GalleryItem[] {
  const plat = b.platforms.find((p) => p.endsWith("_ads")) ?? "meta_ads";
  const sd = seedOf(b.name);
  const sp = spendLabel(b.spend);
  return [
    ["ad", plat, "creativo · 12d", [sp, `${fmtK(b.reach * 0.6)} 👁`], true, gpic(sd + "a1")],
    ["ad", plat, "video · 8d", [sp, `${fmtK(b.reach * 0.4)} 👁`], true, gpic(sd + "a2"), vidFor(b.name, 0)],
    ["ad", plat, "static · 5d", [sp, `${fmtK(b.reach * 0.2)} 👁`], true, gpic(sd + "a3")],
  ];
}
function organicItems(b: Brand): GalleryItem[] {
  const sd = seedOf(b.name);
  const ps = b.platforms.filter((p) => !p.endsWith("_ads"));
  const p0 = ps[0] ?? "instagram", p1 = ps[1] ?? p0, p2 = ps[2] ?? p1;
  return [
    ["photo", p0, b.top, [`${fmtK(b.eng * 0.3)} ♡`, "4 h"], false, gpic(sd + "o1")],
    ["video", p1, "reel / POV", [`${fmtK(b.eng * 0.6)} ▷`, "1 d"], false, gpic(sd + "o2"), vidFor(b.name, 2)],
    ["photo", p2, "carrusel", [`${fmtK(b.eng * 0.15)} ♡`, "2 d"], false, gpic(sd + "o3")],
  ];
}
function buildGallery(brands: Brand[]) {
  const withSpend = brands.filter((b) => b.spend).sort((a, b) => b.ads - a.ads);
  const adGroups: GalleryGroup[] = (withSpend.length ? withSpend : brands).slice(0, 3).map((b) => ({ name: b.name, count: b.ads, items: adItems(b) }));
  const organicGroups: GalleryGroup[] = [...brands].sort((a, b) => b.organic - a.organic).slice(0, 3).map((b) => ({ name: `${b.name} · ${b.organic}`, count: b.organic, items: organicItems(b) }));
  const adTotal = brands.reduce((a, b) => a + b.ads, 0);
  const spLow = brands.reduce((a, b) => a + (b.spend ? b.spend[0] : 0), 0);
  const spHigh = brands.reduce((a, b) => a + (b.spend ? b.spend[1] : 0), 0);
  const organicTotal = brands.reduce((a, b) => a + b.organic, 0);
  return { adGroups, organicGroups, adTotal, adSpend: spLow ? `USD ${spLow}–${spHigh}k` : "—", organicTotal };
}

// Radar (client vs leader) over 6 dimensions. Values normalized 0–100; the
// "Engagement" axis is per-piece (eng/mentions) so it reflects efficiency, not
// raw volume — which is exactly the competitive read the radar is meant to show.
function deriveRadar(brands: Brand[]): RadarVM {
  const client = brands.find((b) => b.isClient) ?? brands[0];
  const leader = brands.filter((b) => b !== client).sort((a, b) => b.sov - a.sov)[0] ?? brands[0];
  const epp = (b: Brand) => b.eng / Math.max(1, b.mentions);
  const maxSov = Math.max(...brands.map((b) => b.sov), 1);
  const maxEpp = Math.max(...brands.map(epp), 1);
  const maxSpend = Math.max(...brands.map((b) => (b.spend ? b.spend[1] : 0)), 1);
  const maxFreq = Math.max(...brands.map((b) => b.freq), 1);
  const maxOrg = Math.max(...brands.map((b) => b.organic), 1);
  const sent = (s: SentimentKind) => (s === "pos" ? 88 : s === "mix" ? 62 : s === "neg" ? 32 : 50);
  const tk = (b: Brand) => (b.platforms.includes("tiktok") ? Math.round((b.organic / maxOrg) * 90) : 10);
  const vals = (b: Brand) => [
    Math.round((b.sov / maxSov) * 95),
    Math.round((epp(b) / maxEpp) * 95),
    sent(b.sentiment),
    Math.round(((b.spend ? b.spend[1] : 0) / maxSpend) * 95),
    Math.round((b.freq / maxFreq) * 92),
    tk(b),
  ];
  return {
    axes: ["SOV", "Engagement", "Sentimiento", "Pauta paga", "Cadencia", "TikTok org."],
    series: [
      { name: client.name, color: "var(--accent)", vals: vals(client) },
      { name: `${leader.name} · líder`, color: "var(--series-2)", vals: vals(leader) },
    ],
  };
}

function buildSwot(s: Strategy) {
  return {
    swot: [
      { key: "S", title: "Fortalezas", tone: "var(--success)", items: s.S },
      { key: "W", title: "Debilidades", tone: "var(--danger)", items: s.W },
      { key: "O", title: "Oportunidades", tone: "var(--info)", items: s.O },
      { key: "T", title: "Amenazas", tone: "var(--warn)", items: s.T },
    ] as Quad[],
    matrix: [
      { key: "ACT", title: "Act · actuar ya", sub: "alto impacto / control propio", color: "var(--accent)", items: s.act },
      { key: "WAIT", title: "Wait · observar", sub: "monitorear antes de mover", color: "var(--text-muted)", items: s.wait },
      { key: "REACT", title: "React · reaccionar", sub: "responder señales en curso", color: "var(--info)", items: s.react },
      { key: "FALLBACK", title: "Fall back · replegar", sub: "proteger si escala el riesgo", color: "var(--warn)", items: s.fallback },
    ] as Move[],
    plan: [
      { title: "Corto plazo", window: "0–30 días", items: s.short },
      { title: "Mediano plazo", window: "1–3 meses", items: s.mid },
      { title: "Largo plazo", window: "3–12 meses", items: s.long },
    ] as Horizon[],
  };
}

function resolve(def: CaseDef): ResolvedCase {
  const sections = def.sections ?? {};
  const baseSections: Record<string, AnalysisVM> = {
    overview: sections.overview ?? def.analysis,
    comparativa: sections.comparativa ?? def.analysis,
    "live-feed": sections["live-feed"] ?? def.analysis,
    galeria: sections.galeria ?? def.analysis,
    swot: sections.swot ?? def.analysis,
  };
  return {
    slug: def.slug,
    project: def.project,
    crumb: def.crumb,
    runNumber: def.runNumber,
    competitors: buildCompetitors(def.brands),
    insights: def.insights,
    mentions: def.mentions,
    run: { number: def.runNumber, used: def.cost, soft: Math.round(def.cost * 1.6), hard: Math.round(def.cost * 2.4) },
    hero: def.hero,
    kpis: buildKpis(def.brands),
    comparativa: buildComparativa(def.brands),
    gallery: buildGallery(def.brands),
    swot: { ...buildSwot(def.strategy), radar: def.radar ?? deriveRadar(def.brands) },
    sections: baseSections,
    analysis: def.analysis,
  };
}

// Compact mention helper
function M(platform: PlatformKey, brand: string, handle: string, ts: string, body: string, sentiment: SentimentKind, opt: Partial<MentionVM> = {}): MentionVM {
  return { platform, author: brand, handle, ts, brand, body, sentiment, isAd: false, metrics: [], ...opt };
}

// ===========================================================================
// CASES
// ===========================================================================
const DEFS: CaseDef[] = [
  // ---- Aerolíneas · Copa / Cartagena (reuses the rich Copa fixtures) --------
  {
    slug: "cartagena-q2-2026",
    project: "Copa · Cartagena Q2",
    category: "Aerolíneas",
    crumb: "Cartagena · Q2 2026",
    geo: ["Colombia", "Panamá"],
    runNumber: 42,
    cost: 1.84,
    hero: { title: "Cartagena, en el aire", titleEm: "de cuatro aerolíneas.", subtitle: "2.418 piezas analizadas entre el 1 de marzo y el 30 de abril de 2026 · IG · TT · YT · X · Reddit · Web · Anuncios." },
    brands: [
      { name: "Avianca", handle: "avianca", letter: "A", platforms: ["instagram", "tiktok", "youtube", "x", "meta_ads"], mentions: 998, sov: 41.3, sentiment: "pos", eng: 412000, reach: 1800000, spend: [18, 28], top: "Sunset reel", freq: 12.4, ads: 38, organic: 84 },
      { name: "LATAM Colombia", handle: "latamcol", letter: "L", platforms: ["instagram", "facebook", "x", "meta_ads"], mentions: 581, sov: 24.0, sentiment: "mix", eng: 264000, reach: 1100000, spend: [10, 14], top: "POV TikTok", freq: 7.8, ads: 24, organic: 56 },
      { name: "Wingo", handle: "wingo.col", letter: "W", platforms: ["instagram", "tiktok", "facebook"], mentions: 312, sov: 12.9, sentiment: "neu", eng: 198000, reach: 680000, spend: null, top: "Vlog 48h", freq: 4.2, ads: 0, organic: 42 },
      { name: "Arajet", handle: "arajetdom", letter: "J", platforms: ["instagram", "x", "web"], mentions: 287, sov: 11.9, sentiment: "neu", eng: 142000, reach: 420000, spend: null, top: "Tarifa promo", freq: 3.8, ads: 0, organic: 30 },
      { name: "Copa Airlines", handle: "copaairlines", letter: "C", isClient: true, platforms: ["instagram", "youtube", "x", "meta_ads"], mentions: 240, sov: 9.9, sentiment: "pos", eng: 188000, reach: 520000, spend: [5, 8], top: "Atardecer post", freq: 3.1, ads: 14, organic: 60 },
    ],
    insights: DEMO_INSIGHTS,
    mentions: DEMO_MENTIONS,
    analysis: DEMO_ANALYSIS_BY_SECTION.overview,
    sections: DEMO_ANALYSIS_BY_SECTION,
    strategy: {
      S: ["Mayor engagement orgánico por pieza de la categoría.", "Sentimiento positivo sólido y estable.", "Perfil 78% orgánico: bajo costo de presencia."],
      W: ["Share of voice bajo (9,9%) vs. Avianca (41,3%).", "Baja presencia en bibliotecas de anuncios.", "Casi sin TikTok orgánico."],
      O: ["TikTok orgánico libre: LATAM está ausente.", "Escalar paid sin diluir el tono que ya funciona.", "Capitalizar el sentimiento mixto de LATAM."],
      T: ["Avianca duplicó su inversión en anuncios.", "Guerra de tarifas (Wingo/Arajet por precio).", "Hilos negativos en Reddit (cambios de horario)."],
      act: ["Lanzar TikTok orgánico (POV/vlog) donde LATAM no está.", "Sumar 1–2 creativos pagos/semana para la ruta."],
      wait: ["Evolución del spend de Avianca semana a semana.", "Nuevas rutas/lanzamientos de Arajet."],
      react: ["Responder el hilo de Reddit de Wingo con info y compensaciones.", "Contraprogramar promos de tarifas."],
      fallback: ["Si la guerra de precios escala, competir con experiencia/bundles, no con descuento.", "Concentrar pauta en segmentos de mayor retorno."],
      short: ["Activar TikTok orgánico con 3–4 piezas POV/vlog.", "Responder el hilo negativo de Reddit.", "2 creativos pagos para la ruta a Cartagena."],
      mid: ["Cadencia fija martes–jueves AM.", "Testear video vs. foto y medir alcance.", "Tablero de SOV semanal."],
      long: ["Construir SOV sostenido sin diluir el sentimiento.", "Programa de afinidad / UGC.", "Inversión orgánico+paid atada a retorno por ruta."],
    },
    radar: {
      axes: ["SOV", "Engagement", "Sentimiento", "Pauta paga", "Cadencia", "TikTok org."],
      series: [
        { name: "Copa Airlines", color: "var(--accent)", vals: [25, 90, 86, 20, 46, 10] },
        { name: "Avianca · líder", color: "var(--series-2)", vals: [95, 55, 50, 95, 82, 58] },
      ],
    },
  },

  // ---- Belleza · Natura vs L'Oréal -----------------------------------------
  {
    slug: "belleza-natura",
    project: "Belleza · Natura vs L'Oréal",
    category: "Beauty",
    crumb: "Belleza · LatAm 2026",
    geo: ["México", "Brasil", "Argentina", "Colombia"],
    runNumber: 36,
    cost: 1.78,
    hero: { title: "Belleza en LatAm,", titleEm: "ritual contra performance.", subtitle: "2.430 piezas entre marzo y mayo de 2026 · IG · TikTok · YouTube · Facebook · Web · Anuncios." },
    brands: [
      { name: "L'Oréal", handle: "lorealparis", letter: "L", platforms: ["instagram", "tiktok", "youtube", "meta_ads"], mentions: 880, sov: 31.2, sentiment: "pos", eng: 520000, reach: 2100000, spend: [20, 30], top: "Tutorial glow", freq: 9.4, ads: 41, organic: 88 },
      { name: "Natura", handle: "natura", letter: "N", isClient: true, platforms: ["instagram", "tiktok", "youtube", "facebook"], mentions: 640, sov: 22.5, sentiment: "pos", eng: 410000, reach: 1500000, spend: [6, 10], top: "Ritual de cuidado", freq: 6.2, ads: 22, organic: 70 },
      { name: "Avon", handle: "avon", letter: "A", platforms: ["instagram", "facebook", "web"], mentions: 520, sov: 18.7, sentiment: "mix", eng: 240000, reach: 900000, spend: [4, 7], top: "Catálogo reels", freq: 5.1, ads: 12, organic: 48 },
      { name: "O Boticário", handle: "oboticario", letter: "O", platforms: ["instagram", "tiktok", "youtube"], mentions: 430, sov: 15.1, sentiment: "pos", eng: 300000, reach: 1100000, spend: [5, 8], top: "Perfume drop", freq: 4.8, ads: 9, organic: 52 },
    ],
    insights: [
      { kind: "opp", title: "Avon casi no usa TikTok orgánico", sources: 34, confidence: "0,84" },
      { kind: "thr", title: "L'Oréal duplicó pauta en Meta", sources: 18, confidence: "0,80" },
      { kind: "pat", title: "Picos domingo 20h (rutinas)", sources: 51, confidence: "0,90" },
    ],
    mentions: [
      M("instagram", "L'Oréal", "lorealparis", "hace 3 h", "Glow rutina: 3 pasos para piel luminosa esta primavera ✨ #LorealParis", "pos", { thumbType: "photo", media: pic("lo-ig1"), metrics: [["♡", "22,1k"], ["💬", "410"]] }),
      M("meta_ads", "L'Oréal", "lorealparis · ad", "activo · 10 d", "Revitalift: -30% en serums seleccionados. Hasta el 31/05.", "pos", { isAd: true, thumbType: "ad", media: pic("lo-ad1"), metrics: [["€", "USD 9–14k"], ["👁", "est. 2,1M"]] }),
      M("tiktok", "Natura", "natura", "hace 8 h", "El ritual Ekos en 30 segundos 🌿 contanos tu favorito 👇 #Natura", "pos", { thumbType: "video", media: pic("na-tt1"), video: VID[2], metrics: [["▷", "640k"], ["♡", "58k"]] }),
      M("youtube", "O Boticário", "oboticario", "hace 1 d", "Lanzamiento de perfume: detrás de la campaña", "pos", { thumbType: "video", metrics: [["▷", "120k"], ["♡", "6,3k"]] }),
      M("instagram", "Avon", "avon", "hace 14 h", "Catálogo 9: lo nuevo en labiales mate 💄", "mix", { thumbType: "photo", media: pic("av-ig9"), metrics: [["♡", "3,1k"], ["💬", "88"]] }),
      M("web", "Vogue", "vogue.mx", "02/05", "Natura y L'Oréal lideran la conversación de belleza sustentable en LatAm.", "neu", { thumbType: "article", metrics: [["📄", "prensa"], ["👁", "31k"]] }),
    ],
    analysis: {
      headline: "L'Oréal lidera el volumen; Natura gana en afinidad y agenda sustentable.",
      body: "En 60 días L'Oréal concentró el 31,2% de la conversación y la mayor pauta, apalancada en tutoriales. Natura sostiene un sentimiento positivo alto con la mitad del gasto, gracias a su narrativa de ritual y sostenibilidad. La oportunidad: convertir esa afinidad en cadencia de TikTok orgánico, donde Avon está ausente.",
      takeaways: [
        "L'Oréal lidera SOV (31,2%) y la inversión en anuncios.",
        "Natura logra alto sentimiento positivo con menor gasto.",
        "Avon casi no usa TikTok orgánico — nicho abierto.",
        "Las rutinas concentran picos los domingos a la noche.",
      ],
      recommendations: [
        "Escalar TikTok orgánico con la narrativa de ritual/sostenibilidad.",
        "Sumar 1–2 creativos pagos por semana enfocados en producto estrella.",
        "Programar contenido de rutina para el pico dominical.",
        "Monitorear los lanzamientos de perfume de O Boticário.",
      ],
    },
    strategy: {
      S: ["Afinidad de marca alta y narrativa de sostenibilidad.", "Buen engagement orgánico con gasto moderado.", "Catálogo de venta directa con comunidad activa."],
      W: ["SOV por debajo de L'Oréal (22,5% vs 31,2%).", "Menor inversión paga que el líder.", "Dependencia del canal Instagram."],
      O: ["TikTok orgánico con poca competencia (Avon ausente).", "Tendencia de belleza sustentable en alza.", "Cross-selling perfumería vs. O Boticário."],
      T: ["L'Oréal duplicó pauta en Meta.", "Presión de precio en venta directa (Avon).", "Saturación de tutoriales en la categoría."],
      act: ["Plan de TikTok orgánico de ritual/skincare.", "Pauta quirúrgica en producto estrella."],
      wait: ["Evolución del spend de L'Oréal.", "Recepción de los drops de perfume de O Boticário."],
      react: ["Responder dudas de fórmula/ingredientes en comentarios.", "Contraprogramar promos de catálogo de Avon."],
      fallback: ["Si el precio aprieta, competir con valor/sostenibilidad, no con descuento.", "Concentrar pauta en SKUs de mayor margen."],
      short: ["4 piezas TikTok de ritual.", "Calendario de lanzamientos por mercado.", "2 creativos pagos de producto estrella."],
      mid: ["Programa de creadoras/UGC por país.", "Test de formato tutorial vs. ritual.", "Tablero de sentimiento por SKU."],
      long: ["Liderazgo en belleza sustentable regional.", "Modelo omnicanal (directa + retail).", "Inversión atada a LTV por consultora."],
    },
  },

  // ---- Moda · Zara vs H&M ---------------------------------------------------
  {
    slug: "moda-zara-hm",
    project: "Moda · Zara vs H&M",
    category: "Retail / Moda",
    crumb: "Moda · LatAm 2026",
    geo: ["Argentina", "México", "Colombia", "Chile"],
    runNumber: 40,
    cost: 2.1,
    hero: { title: "Fast fashion,", titleEm: "drops contra haul.", subtitle: "2.720 piezas entre marzo y mayo de 2026 · IG · TikTok · Web · Anuncios." },
    brands: [
      { name: "Zara", handle: "zara", letter: "Z", isClient: true, platforms: ["instagram", "tiktok", "web", "meta_ads"], mentions: 910, sov: 34.0, sentiment: "pos", eng: 560000, reach: 2400000, spend: [15, 22], top: "Lookbook otoño", freq: 10.1, ads: 33, organic: 92 },
      { name: "H&M", handle: "hm", letter: "H", platforms: ["instagram", "tiktok", "meta_ads"], mentions: 760, sov: 28.4, sentiment: "mix", eng: 440000, reach: 1800000, spend: [12, 18], top: "Conscious drop", freq: 8.3, ads: 27, organic: 80 },
      { name: "Shein", handle: "shein", letter: "S", platforms: ["instagram", "tiktok"], mentions: 690, sov: 24.1, sentiment: "neg", eng: 600000, reach: 2600000, spend: [10, 16], top: "Haul viral", freq: 12.4, ads: 0, organic: 96 },
      { name: "Mango", handle: "mango", letter: "M", platforms: ["instagram", "web"], mentions: 360, sov: 13.5, sentiment: "pos", eng: 210000, reach: 820000, spend: [3, 6], top: "Editorial Mango", freq: 4.1, ads: 6, organic: 40 },
    ],
    insights: [
      { kind: "thr", title: "Shein domina el UGC en TikTok", sources: 47, confidence: "0,88" },
      { kind: "opp", title: "H&M con sentimiento mixto por precios", sources: 22, confidence: "0,79" },
      { kind: "pat", title: "Drops con pico los viernes AM", sources: 60, confidence: "0,92" },
    ],
    mentions: [
      M("tiktok", "Shein", "shein", "hace 5 h", "Shein haul de otoño: 12 prendas, ¿cuál te gusta más? 👀 #sheinhaul", "neg", { thumbType: "video", media: pic("sh-tt1"), video: VID[0], metrics: [["▷", "1,8M"], ["♡", "120k"]] }),
      M("instagram", "Zara", "zara", "hace 9 h", "New in: la paleta tierra de la temporada. #zara", "pos", { thumbType: "photo", media: pic("za-ig1"), metrics: [["♡", "44k"], ["💬", "510"]] }),
      M("meta_ads", "H&M", "hm · ad", "activo · 7 d", "H&M Conscious: nueva colección con materiales reciclados. Envío gratis.", "mix", { isAd: true, thumbType: "ad", media: pic("hm-ad1"), metrics: [["€", "USD 6–9k"], ["👁", "est. 1,2M"]] }),
      M("instagram", "Mango", "mango", "hace 1 d", "Editorial primavera: lino y siluetas fluidas.", "pos", { thumbType: "photo", media: pic("ma-ig1"), metrics: [["♡", "9,4k"], ["💬", "120"]] }),
      M("tiktok", "Zara", "zara", "hace 13 h", "Styling: 3 looks con un solo blazer 🧥 #zarastyle", "pos", { thumbType: "video", metrics: [["▷", "420k"], ["♡", "33k"]] }),
      M("web", "Vogue", "vogue.es", "30/04", "Shein vs. la moda consciente: el dilema del consumidor joven en LatAm.", "neg", { thumbType: "article", metrics: [["📄", "prensa"], ["👁", "52k"]] }),
    ],
    analysis: {
      headline: "Zara lidera deseo de marca; Shein domina el volumen vía UGC.",
      body: "Zara encabeza el SOV (34%) con un sentimiento positivo apoyado en lookbooks, mientras Shein genera el mayor volumen y alcance puramente orgánico (haul/UGC) pero con sentimiento negativo por sostenibilidad. H&M queda en el medio con percepción mixta por precios. El espacio: capitalizar el deseo de marca con cadencia de TikTok styling.",
      takeaways: [
        "Zara lidera SOV (34%) y deseo de marca.",
        "Shein gana volumen y reach con UGC, pero con sentimiento negativo.",
        "H&M muestra sentimiento mixto por precios.",
        "Los drops marcan picos los viernes a la mañana.",
      ],
      recommendations: [
        "Reforzar TikTok de styling para convertir deseo en volumen.",
        "Calendarizar drops para el pico de los viernes.",
        "Diferenciarse de Shein por calidad/durabilidad.",
        "Vigilar el sentimiento de precio de H&M para contrastar.",
      ],
    },
    strategy: {
      S: ["Mayor deseo de marca de la categoría.", "Lookbooks con alto engagement.", "Pauta eficiente y presencia omnicanal."],
      W: ["Volumen orgánico por debajo de Shein.", "Menor presencia de UGC espontáneo.", "Percepción de precio premium."],
      O: ["TikTok styling para convertir deseo en alcance.", "Diferencial calidad vs. Shein.", "Drops calendarizados para el pico semanal."],
      T: ["Shein domina el UGC y el reach.", "Presión de precios de H&M.", "Escrutinio de sostenibilidad en la categoría."],
      act: ["Serie de TikTok de styling con un mismo producto.", "Calendario de drops alineado al pico viernes."],
      wait: ["Evolución del UGC de Shein.", "Movimientos de precio de H&M."],
      react: ["Responder tendencias virales con contenido propio.", "Aclarar prácticas de calidad/sostenibilidad."],
      fallback: ["Si Shein presiona en precio, sostener valor de marca/calidad.", "Concentrar pauta en colecciones estrella."],
      short: ["6 piezas TikTok de styling.", "Calendario de drops Q2.", "2 creativos pagos por colección."],
      mid: ["Programa de creadores de moda por país.", "Test lookbook vs. styling.", "Tablero de SOV vs. Shein/H&M."],
      long: ["Consolidar deseo de marca regional.", "Estrategia de sostenibilidad comunicable.", "Modelo de inversión por colección y retorno."],
    },
  },

  // ---- Fintech · Ualá vs Brubank -------------------------------------------
  {
    slug: "fintech-uala",
    project: "Fintech · Ualá vs Brubank",
    category: "Fintech",
    crumb: "Fintech · LatAm 2026",
    geo: ["Argentina", "México", "Colombia"],
    runNumber: 39,
    cost: 1.95,
    hero: { title: "Billeteras digitales,", titleEm: "la batalla por la confianza.", subtitle: "2.410 piezas entre marzo y mayo de 2026 · IG · X · TikTok · YouTube · Anuncios." },
    brands: [
      { name: "Mercado Pago", handle: "mercadopago", letter: "M", platforms: ["instagram", "x", "youtube", "meta_ads"], mentions: 980, sov: 38.5, sentiment: "mix", eng: 520000, reach: 2000000, spend: [22, 32], top: "Cashback campaign", freq: 9.0, ads: 44, organic: 86 },
      { name: "Ualá", handle: "uala", letter: "U", isClient: true, platforms: ["instagram", "tiktok", "x", "youtube"], mentions: 540, sov: 27.0, sentiment: "pos", eng: 320000, reach: 1200000, spend: [5, 9], top: "Tips de finanzas", freq: 6.0, ads: 16, organic: 64 },
      { name: "Naranja X", handle: "naranjax", letter: "N", platforms: ["instagram", "tiktok", "facebook"], mentions: 470, sov: 18.3, sentiment: "neu", eng: 260000, reach: 900000, spend: [4, 7], top: "Plan Z reels", freq: 5.2, ads: 10, organic: 54 },
      { name: "Brubank", handle: "brubank", letter: "B", platforms: ["instagram", "x", "tiktok"], mentions: 420, sov: 16.2, sentiment: "pos", eng: 240000, reach: 760000, spend: [3, 6], top: "Sin sucursales", freq: 4.6, ads: 8, organic: 50 },
    ],
    insights: [
      { kind: "thr", title: "Mercado Pago duplica share en pauta", sources: 31, confidence: "0,86" },
      { kind: "opp", title: "Brubank crece en X orgánico", sources: 19, confidence: "0,77" },
      { kind: "pat", title: "Quejas de soporte los lunes", sources: 44, confidence: "0,83" },
    ],
    mentions: [
      M("x", "Mercado Pago", "mercadopago", "hace 2 h", "Cashback de 20% en transporte toda la semana. Activá desde la app.", "mix", { metrics: [["♡", "1,9k"], ["🔁", "240"]] }),
      M("tiktok", "Ualá", "uala", "hace 7 h", "3 tips para ordenar tus finanzas en 1 minuto 💸 #finanzaspersonales", "pos", { thumbType: "video", media: pic("ua-tt1"), video: VID[1], metrics: [["▷", "380k"], ["♡", "29k"]] }),
      M("meta_ads", "Mercado Pago", "mercadopago · ad", "activo · 9 d", "Rendí tu plata todos los días. Sin mínimos, sin plazos.", "neu", { isAd: true, thumbType: "ad", media: pic("mp-ad1"), metrics: [["€", "USD 11–16k"], ["👁", "est. 2M"]] }),
      M("instagram", "Brubank", "brubank", "hace 1 d", "Sin sucursales, sin filas. Todo desde el celu. 💙", "pos", { thumbType: "photo", media: pic("br-ig1"), metrics: [["♡", "5,1k"], ["💬", "140"]] }),
      M("x", "Naranja X", "naranjax", "hace 11 h", "Plan Z: comprá en cuotas con tu saldo. Ya disponible.", "neu", { metrics: [["♡", "820"], ["🔁", "96"]] }),
      M("reddit", "r/merval", "u/finanzas_ar", "hace 2 d", "¿Conviene dejar la plata en Ualá o Mercado Pago para el rendimiento?", "neu", { metrics: [["↑", "210"], ["💬", "88"]] }),
    ],
    analysis: {
      headline: "Mercado Pago domina vía pauta; Ualá lidera la confianza educativa.",
      body: "Mercado Pago concentra el 38,5% del SOV apalancado en campañas de cashback y la mayor inversión, pero con sentimiento mixto. Ualá sostiene el mejor sentimiento con contenido educativo de finanzas personales y la mitad del gasto. El terreno fértil: escalar ese contenido y atacar las quejas de soporte que afectan a toda la categoría los lunes.",
      takeaways: [
        "Mercado Pago lidera SOV (38,5%) y duplica la pauta.",
        "Ualá logra el mejor sentimiento con contenido educativo.",
        "Brubank crece en X de forma orgánica.",
        "Las quejas de soporte se concentran los lunes.",
      ],
      recommendations: [
        "Escalar el contenido educativo de finanzas (TikTok/Reels).",
        "Reforzar atención de soporte y comunicarla los lunes.",
        "Diferenciarse de MP por confianza y simpleza, no por cashback.",
        "Monitorear el crecimiento orgánico de Brubank en X.",
      ],
    },
    strategy: {
      S: ["Mejor sentimiento de la categoría.", "Contenido educativo con buena recepción.", "Marca asociada a simpleza y confianza."],
      W: ["SOV por debajo de Mercado Pago.", "Menor inversión en pauta.", "Exposición a quejas de soporte."],
      O: ["Educación financiera con demanda creciente.", "Atacar el pain de soporte de la categoría.", "X/TikTok orgánico para crecer barato."],
      T: ["Mercado Pago duplica pauta y cashback.", "Guerra de rendimientos/promos.", "Quejas de soporte que erosionan confianza."],
      act: ["Serie educativa semanal en TikTok/Reels.", "Plan de respuesta de soporte visible."],
      wait: ["Campañas de cashback de MP.", "Crecimiento orgánico de Brubank."],
      react: ["Responder dudas de rendimiento en redes.", "Gestionar quejas de soporte en tiempo real."],
      fallback: ["Si MP presiona con cashback, competir con confianza/simpleza.", "Priorizar features de mayor retención."],
      short: ["4 piezas educativas.", "Protocolo de soporte de lunes.", "2 creativos de confianza/simpleza."],
      mid: ["Programa de creadores de finanzas.", "Test educativo vs. promocional.", "Tablero de sentimiento por feature."],
      long: ["Posicionarse como la fintech de confianza.", "Ecosistema de educación financiera.", "Inversión atada a retención/LTV."],
    },
  },

  // ---- Indumentaria deportiva · Nike vs adidas -----------------------------
  {
    slug: "deportiva-nike-adidas",
    project: "Deportiva · Nike vs adidas",
    category: "Indumentaria",
    crumb: "Deportiva · LatAm 2026",
    geo: ["México", "Argentina", "Brasil", "Colombia"],
    runNumber: 33,
    cost: 2.46,
    hero: { title: "Sportswear,", titleEm: "el relato del lanzamiento.", subtitle: "2.640 piezas entre marzo y mayo de 2026 · IG · TikTok · YouTube · X · Anuncios." },
    brands: [
      { name: "Nike", handle: "nike", letter: "N", isClient: true, platforms: ["instagram", "tiktok", "youtube", "x", "meta_ads"], mentions: 1020, sov: 36.8, sentiment: "pos", eng: 720000, reach: 3200000, spend: [25, 40], top: "Athlete film", freq: 11.2, ads: 39, organic: 96 },
      { name: "adidas", handle: "adidas", letter: "A", platforms: ["instagram", "tiktok", "youtube", "meta_ads"], mentions: 880, sov: 31.5, sentiment: "pos", eng: 640000, reach: 2800000, spend: [20, 30], top: "Boost launch", freq: 9.8, ads: 34, organic: 90 },
      { name: "Puma", handle: "puma", letter: "P", platforms: ["instagram", "tiktok"], mentions: 460, sov: 16.0, sentiment: "neu", eng: 320000, reach: 1200000, spend: [6, 10], top: "Speed reels", freq: 5.4, ads: 12, organic: 60 },
      { name: "Topper", handle: "topper", letter: "T", platforms: ["instagram", "facebook", "web"], mentions: 280, sov: 9.2, sentiment: "neu", eng: 140000, reach: 480000, spend: [1, 3], top: "Local hero", freq: 3.0, ads: 4, organic: 34 },
    ],
    insights: [
      { kind: "pat", title: "Lanzamientos con pico los jueves", sources: 58, confidence: "0,91" },
      { kind: "opp", title: "Topper: espacio local sin pauta", sources: 17, confidence: "0,74" },
      { kind: "thr", title: "adidas iguala a Nike en TikTok", sources: 26, confidence: "0,82" },
    ],
    mentions: [
      M("youtube", "Nike", "nike", "hace 4 h", "Athlete film: la historia detrás del próximo récord. #justdoit", "pos", { thumbType: "video", media: pic("ni-yt1"), video: VID[2], metrics: [["▷", "1,1M"], ["♡", "88k"]] }),
      M("tiktok", "adidas", "adidas", "hace 8 h", "Unboxing del nuevo Boost 🔥 ¿lo comprarías? #adidas", "pos", { thumbType: "video", media: pic("ad-tt1"), metrics: [["▷", "740k"], ["♡", "61k"]] }),
      M("meta_ads", "Nike", "nike · ad", "activo · 6 d", "Nuevo drop. Disponible en app. Envío exprés.", "pos", { isAd: true, thumbType: "ad", media: pic("ni-ad1"), metrics: [["€", "USD 14–22k"], ["👁", "est. 3M"]] }),
      M("instagram", "Puma", "puma", "hace 1 d", "Speed week: corré más rápido con la nueva línea.", "neu", { thumbType: "photo", media: pic("pu-ig1"), metrics: [["♡", "12k"], ["💬", "180"]] }),
      M("instagram", "Topper", "topper", "hace 15 h", "Hecho acá. El clásico que vuelve. 🇦🇷", "neu", { thumbType: "photo", media: pic("to-ig1"), metrics: [["♡", "3,4k"], ["💬", "96"]] }),
      M("x", "adidas", "adidas", "hace 12 h", "Drop del jueves agotado en 2 horas. Gracias. 🙌", "pos", { metrics: [["♡", "2,2k"], ["🔁", "310"]] }),
    ],
    analysis: {
      headline: "Nike lidera con relato de atleta; adidas empareja en TikTok.",
      body: "Nike encabeza el SOV (36,8%) y el engagement con storytelling de atleta y el mayor gasto. adidas viene cerca y ya iguala a Nike en TikTok con lanzamientos de producto. Puma compite por performance y Topper tiene un espacio local sin explotar. La palanca: defender el liderazgo de TikTok y calendarizar los drops para el pico del jueves.",
      takeaways: [
        "Nike lidera SOV (36,8%) y engagement con relato de atleta.",
        "adidas ya iguala a Nike en TikTok vía lanzamientos.",
        "Topper tiene un espacio local sin pauta.",
        "Los lanzamientos marcan el pico los jueves.",
      ],
      recommendations: [
        "Defender el liderazgo de TikTok con contenido de producto.",
        "Calendarizar los drops para el pico del jueves.",
        "Sostener el storytelling de atleta como diferencial.",
        "Vigilar el avance de adidas en TikTok.",
      ],
    },
    strategy: {
      S: ["Mayor engagement con storytelling de atleta.", "Liderazgo de SOV y reach.", "Pauta robusta y comunidad global."],
      W: ["adidas empareja en TikTok.", "Costo de pauta elevado.", "Riesgo de saturación de drops."],
      O: ["Defender TikTok con producto + atleta.", "Calendario de drops del jueves.", "Colaboraciones locales frente a Topper."],
      T: ["adidas iguala en TikTok.", "Puma presiona en performance.", "Fatiga de lanzamientos."],
      act: ["Serie TikTok de producto + atleta.", "Drops calendarizados al pico semanal."],
      wait: ["Avance de adidas en TikTok.", "Lanzamientos de Puma."],
      react: ["Amplificar sold-outs con prueba social.", "Responder hype con stock/restock claro."],
      fallback: ["Si adidas iguala, reforzar relato de marca, no sólo producto.", "Concentrar pauta en franquicias top."],
      short: ["6 piezas TikTok de drop.", "Calendario de lanzamientos jueves.", "2 films de atleta."],
      mid: ["Programa de creadores deportivos.", "Test relato vs. producto.", "Tablero de SOV vs. adidas."],
      long: ["Consolidar liderazgo cultural del deporte.", "Ecosistema app + comunidad.", "Inversión por franquicia y retorno."],
    },
  },

  // ---- Café de especialidad LatAm ------------------------------------------
  {
    slug: "cafe-latam",
    project: "Café de especialidad LatAm",
    category: "Food & Bev",
    crumb: "Café · LatAm 2026",
    geo: ["Colombia", "México", "Argentina"],
    runNumber: 38,
    cost: 1.4,
    hero: { title: "Café de especialidad,", titleEm: "del origen a la taza.", subtitle: "1.310 piezas entre marzo y mayo de 2026 · IG · TikTok · YouTube · Web." },
    brands: [
      { name: "Juan Valdez", handle: "juanvaldezcafe", letter: "J", isClient: true, platforms: ["instagram", "tiktok", "youtube", "web"], mentions: 520, sov: 33.4, sentiment: "pos", eng: 280000, reach: 980000, spend: [4, 7], top: "Origen reels", freq: 5.8, ads: 9, organic: 58 },
      { name: "Tostao", handle: "tostao", letter: "T", platforms: ["instagram", "facebook"], mentions: 360, sov: 21.6, sentiment: "neu", eng: 160000, reach: 520000, spend: [1, 3], top: "Precio barista", freq: 3.9, ads: 3, organic: 36 },
      { name: "Devoción", handle: "devocion", letter: "D", platforms: ["instagram", "web"], mentions: 240, sov: 14.2, sentiment: "pos", eng: 120000, reach: 410000, spend: [1, 2], top: "Fresh roast", freq: 2.8, ads: 2, organic: 30 },
      { name: "Café San Alberto", handle: "cafesanalberto", letter: "S", platforms: ["instagram", "youtube"], mentions: 190, sov: 11.0, sentiment: "pos", eng: 90000, reach: 300000, spend: null, top: "Tour finca", freq: 2.2, ads: 0, organic: 24 },
    ],
    insights: [
      { kind: "opp", title: "Devoción premium sin TikTok", sources: 21, confidence: "0,80" },
      { kind: "pat", title: "Conversación pico 7–9h", sources: 49, confidence: "0,90" },
      { kind: "thr", title: "Tostao compite por precio", sources: 18, confidence: "0,72" },
    ],
    mentions: [
      M("instagram", "Juan Valdez", "juanvaldezcafe", "hace 3 h", "Del origen a tu taza: conocé a los caficultores detrás del lote. ☕ #JuanValdez", "pos", { thumbType: "photo", media: pic("jv-ig1"), metrics: [["♡", "14k"], ["💬", "230"]] }),
      M("tiktok", "Juan Valdez", "juanvaldezcafe", "hace 9 h", "Cómo se hace un cold brew perfecto en casa 🧊☕", "pos", { thumbType: "video", media: pic("jv-tt1"), video: VID[0], metrics: [["▷", "210k"], ["♡", "18k"]] }),
      M("instagram", "Devoción", "devocion", "hace 1 d", "Fresh roast semanal: del campo a NYC en días.", "pos", { thumbType: "photo", media: pic("de-ig1"), metrics: [["♡", "6,2k"], ["💬", "140"]] }),
      M("web", "La República", "larepublica.co", "28/04", "El café de especialidad crece en LatAm: marcas y consumo premium.", "neu", { thumbType: "article", metrics: [["📄", "prensa"], ["👁", "19k"]] }),
      M("instagram", "Tostao", "tostao", "hace 16 h", "Tu café de siempre, al mejor precio. ☕", "neu", { thumbType: "photo", media: pic("ts-ig1"), metrics: [["♡", "2,1k"], ["💬", "60"]] }),
      M("youtube", "Café San Alberto", "cafesanalberto", "hace 2 d", "Tour por la finca: cómo nace un café premiado", "pos", { thumbType: "video", metrics: [["▷", "32k"], ["♡", "2,4k"]] }),
    ],
    analysis: {
      headline: "Juan Valdez lidera con relato de origen; Tostao presiona por precio.",
      body: "Juan Valdez encabeza el SOV (33,4%) con una narrativa de origen y caficultores que sostiene un sentimiento muy positivo, con baja inversión. Tostao compite por precio y Devoción juega premium pero sin TikTok. La oportunidad está en escalar el contenido de origen/preparación en TikTok, donde casi no hay competencia, en el pico de consumo matutino.",
      takeaways: [
        "Juan Valdez lidera SOV (33,4%) con relato de origen.",
        "Tostao compite por precio con sentimiento neutro.",
        "Devoción es premium pero no usa TikTok.",
        "La conversación pico es de 7 a 9 de la mañana.",
      ],
      recommendations: [
        "Escalar TikTok de origen/preparación (espacio libre).",
        "Programar contenido para el pico matutino.",
        "Sostener la narrativa de caficultores como diferencial.",
        "Monitorear la presión de precio de Tostao.",
      ],
    },
    strategy: {
      S: ["Narrativa de origen con alta afinidad.", "Sentimiento muy positivo con bajo gasto.", "Comunidad y trazabilidad del producto."],
      W: ["Volumen total acotado de la categoría.", "Poca presencia paga.", "Cadencia de TikTok mejorable."],
      O: ["TikTok de origen/preparación sin competencia.", "Pico de consumo matutino.", "Premiumización del café de especialidad."],
      T: ["Tostao presiona por precio.", "Devoción crece en nicho premium.", "Commoditización del café."],
      act: ["Serie TikTok de origen y métodos.", "Calendario matutino de publicación."],
      wait: ["Movimientos de precio de Tostao.", "Expansión de Devoción."],
      react: ["Responder dudas de preparación en comentarios.", "Contrastar valor de origen frente a precio."],
      fallback: ["Si el precio aprieta, reforzar origen/calidad, no descuento.", "Priorizar SKUs premium de mayor margen."],
      short: ["4 piezas TikTok de origen/método.", "Calendario matutino.", "1–2 colaboraciones con baristas."],
      mid: ["Programa de creadores de café.", "Test origen vs. preparación.", "Tablero de sentimiento por línea."],
      long: ["Liderar el relato de café de especialidad.", "Experiencias de origen/tienda.", "Inversión atada a recompra premium."],
    },
  },
];

const CASES: Record<string, ResolvedCase> = Object.fromEntries(DEFS.map((d) => [d.slug, resolve(d)]));

export const DEFAULT_CASE_SLUG = "cartagena-q2-2026";

export function getCase(slug?: string | null): ResolvedCase {
  return (slug && CASES[slug]) || CASES[DEFAULT_CASE_SLUG];
}

export function hasCase(slug?: string | null): slug is string {
  return Boolean(slug && CASES[slug]);
}
