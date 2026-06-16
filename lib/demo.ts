import type { CompetitorVM, MentionVM, InsightVM, OverviewData } from "@/lib/view-models";
import { sparkFor } from "@/lib/view-models";

// Free placeholder media (Lorem Picsum + Google sample video). Swap for scraped.
const pic = (s: string) => `https://picsum.photos/seed/bb-${s}/600/600`;
// Short, light sample clips (~2 MB), remote — autoplay-on-scroll in feed/gallery.
const vid = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4";
const vid2 = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4";
const vid3 = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4";

// Demo data for the Copa · Cartagena case. Used as a resilient fallback when
// Supabase isn't reachable/seeded, so the deployed site never breaks.

export const DEMO_COMPETITORS: CompetitorVM[] = [
  { name: "Avianca", handle: "avianca", brandLetter: "A", accent: "var(--series-1)", isClient: false, platforms: ["instagram", "tiktok", "youtube", "x", "meta_ads"], mentions: "998", sov: "41,3", sentiment: "pos", sparkData: sparkFor(0) },
  { name: "LATAM Colombia", handle: "latamcol", brandLetter: "L", accent: "var(--series-2)", isClient: false, platforms: ["instagram", "facebook", "x", "meta_ads"], mentions: "581", sov: "24,0", sentiment: "mix", sparkData: sparkFor(1) },
  { name: "Wingo", handle: "wingo.col", brandLetter: "W", accent: "var(--series-3)", isClient: false, platforms: ["instagram", "tiktok", "facebook"], mentions: "312", sov: "12,9", sentiment: "neu", sparkData: sparkFor(2) },
  { name: "Arajet", handle: "arajetdom", brandLetter: "J", accent: "var(--series-4)", isClient: false, platforms: ["instagram", "x", "web"], mentions: "287", sov: "11,9", sentiment: "neu", sparkData: sparkFor(3) },
  { name: "Copa Airlines", handle: "copaairlines", brandLetter: "C", accent: "var(--series-client)", isClient: true, platforms: ["instagram", "youtube", "x", "meta_ads"], mentions: "240", sov: "9,9", sentiment: "pos", sparkData: sparkFor(4) },
];

export const DEMO_INSIGHTS: InsightVM[] = [
  { kind: "opp", title: "LATAM no usa TikTok orgánico", sources: 38, confidence: "0,87" },
  { kind: "thr", title: "Avianca duplicó spend en Meta", sources: 14, confidence: "0,79" },
  { kind: "pat", title: "Picos jueves 11h", sources: 62, confidence: "0,92" },
];

export const DEMO_OVERVIEW: OverviewData = {
  competitors: DEMO_COMPETITORS,
  insights: DEMO_INSIGHTS,
  run: { number: 42, used: 42.18, soft: 50, hard: 75 },
};

export const DEMO_MENTIONS: MentionVM[] = [
  { platform: "instagram", author: "Avianca", handle: "avianca", ts: "hace 4 h", brand: "Avianca", body: "Cartagena en frecuencia diaria desde Bogotá y Medellín. Conocé los nuevos horarios ☀️", thumbType: "photo", media: pic("av-ig1"), sentiment: "pos", isAd: false, metrics: [["♡", "12,4k"], ["💬", "284"], ["↗", "842"]] },
  { platform: "meta_ads", author: "Avianca", handle: "avianca · ad", ts: "activo · 12 d", brand: "Avianca", isAd: true, body: "Vuelos a Cartagena desde USD 89. Combiná con Medellín y Santa Marta. Reservá hasta el 30/05.", thumbType: "ad", media: pic("av-ad1"), sentiment: "pos", metrics: [["€", "USD 8–12k"], ["👁", "est. 1,4M"]] },
  { platform: "tiktok", author: "LATAM Colombia", handle: "latamcol", ts: "hace 9 h", brand: "LATAM", body: "POV: tu primera vez en Cartagena. Etiquetá a quien te llevarías 👇 #latamtok", thumbType: "video", media: pic("la-tt1"), video: vid, sentiment: "pos", isAd: false, metrics: [["▷", "1,2M"], ["♡", "98k"], ["💬", "3,4k"]] },
  { platform: "youtube", author: "Wingo", handle: "wingo.col", ts: "hace 1 d", brand: "Wingo", body: "Vlog · Cartagena en 48h con vuelo Wingo · Costos reales · Tips de viaje 2026", thumbType: "video", media: pic("wi-yt1"), video: vid2, sentiment: "neu", isAd: false, metrics: [["▷", "42k"], ["♡", "2,1k"]] },
  { platform: "instagram", author: "Copa Airlines", handle: "copaairlines", ts: "hace 18 h", brand: "Copa", body: "Atardecer en Cartagena, vista desde el equipo Copa ✈️ #copaairlines", thumbType: "photo", media: pic("co-ig1"), sentiment: "pos", isAd: false, metrics: [["♡", "8,2k"], ["💬", "142"]] },
  { platform: "web", author: "El Espectador", handle: "elespectador.com", ts: "03/05", brand: "—", body: "Avianca, LATAM y Wingo aumentan frecuencia a Cartagena para temporada 2026.", thumbType: "article", sentiment: "neu", isAd: false, metrics: [["📄", "prensa"], ["👁", "24k"]] },
  { platform: "x", author: "Arajet", handle: "arajetdom", ts: "hace 6 h", brand: "Arajet", body: "Promo a Cartagena desde RD$ 3.999 ida. Tarifa final con impuestos publicada.", sentiment: "neu", isAd: false, metrics: [["♡", "312"], ["🔁", "48"], ["💬", "22"]] },
  { platform: "reddit", author: "r/ColombiaTravel", handle: "u/sanmt", ts: "hace 2 d", brand: "—", body: "¿Vale la pena Wingo Bogotá–Cartagena? Compré ida + vuelta y hubo cambio de horario 2 veces…", sentiment: "neg", isAd: false, metrics: [["↑", "142"], ["💬", "38"]] },
  { platform: "meta_ads", author: "LATAM", handle: "latamcol · ad", ts: "activo · 4 d", brand: "LATAM", isAd: true, body: "Cartagena con escala en Bogotá. Equipaje incluido. Reservá con LATAM Pass.", thumbType: "ad", sentiment: "neu", metrics: [["€", "USD 4–6k"], ["👁", "est. 620k"]] },
  { platform: "instagram", author: "Wingo", handle: "wingo.col", ts: "hace 7 h", brand: "Wingo", body: "Tarifas a Cartagena que sí caben en tu bolsillo 💜", thumbType: "photo", sentiment: "pos", isAd: false, metrics: [["♡", "3,4k"], ["💬", "96"]] },
  { platform: "facebook", author: "Avianca", handle: "avianca", ts: "hace 1 d", brand: "Avianca", body: "Sumamos un vuelo más por día a Cartagena en temporada alta.", thumbType: "article", sentiment: "pos", isAd: false, metrics: [["♡", "1,9k"], ["💬", "210"]] },
  { platform: "tiktok", author: "Wingo", handle: "wingo.col", ts: "hace 14 h", brand: "Wingo", body: "Cartagena en modo low cost: 3 tips para volar barato ✈️", thumbType: "video", media: pic("wi-tt1"), video: vid3, sentiment: "pos", isAd: false, metrics: [["▷", "210k"], ["♡", "18k"]] },
  { platform: "youtube", author: "Avianca", handle: "avianca", ts: "hace 3 d", brand: "Avianca", body: "Detrás de escena: cómo preparamos un vuelo a Cartagena", thumbType: "video", media: pic("av-yt1"), video: vid, sentiment: "neu", isAd: false, metrics: [["▷", "88k"], ["♡", "4,2k"]] },
  { platform: "x", author: "LATAM Colombia", handle: "latamcol", ts: "hace 11 h", brand: "LATAM", body: "Hoy volamos lleno a Cartagena. Gracias por elegirnos ❤️", sentiment: "pos", isAd: false, metrics: [["♡", "1,1k"], ["🔁", "132"]] },
  { platform: "reddit", author: "r/Colombia", handle: "u/viajero_co", ts: "hace 4 d", brand: "—", body: "Comparativa de precios Bogotá–Cartagena: Avianca vs LATAM vs Wingo", sentiment: "neu", isAd: false, metrics: [["↑", "318"], ["💬", "124"]] },
  { platform: "bluesky", author: "Caro Méndez", handle: "caromendez.bsky.social", ts: "hace 5 h", brand: "—", body: "Servicio impecable de Copa a Cartagena, recomendadísimo 👌", sentiment: "pos", isAd: false, metrics: [["♡", "84"], ["🔁", "12"]] },
  { platform: "instagram", author: "Arajet", handle: "arajetdom", ts: "hace 1 d", brand: "Arajet", body: "Nueva ruta a Cartagena: conocé las fechas de lanzamiento.", thumbType: "photo", sentiment: "pos", isAd: false, metrics: [["♡", "2,2k"], ["💬", "73"]] },
  { platform: "web", author: "Semana", handle: "semana.com", ts: "01/05", brand: "—", body: "Guerra de tarifas a Cartagena: el verano más competitivo en años.", thumbType: "article", sentiment: "mix", isAd: false, metrics: [["📄", "prensa"], ["👁", "41k"]] },
];

export const DEMO_ANALYSIS = {
  headline: "Avianca domina el volumen, pero Copa lidera en eficiencia de engagement.",
  body: "En los últimos 60 días, Avianca concentró el 41,3 % de las menciones sobre Cartagena, casi cuadruplicando a Copa, y duplicó su inversión en Meta Ads. Copa, sin embargo, logra el mayor engagement por pieza con un perfil 78 % orgánico: una marca con alta afinidad y bajo gasto pago. La oportunidad está en escalar la cadencia paga sin diluir el tono orgánico que ya funciona.",
  takeaways: [
    "Avianca lidera SOV (41,3 %) y duplicó inversión en Meta Ads sobre Cartagena.",
    "Copa logra el mayor engagement por pieza, con 78 % de contenido orgánico.",
    "LATAM no usa TikTok orgánico para Cartagena — nicho abierto.",
    "La conversación pico se da entre martes 18 h y jueves 11 h.",
  ],
  recommendations: [
    "Sumar 1–2 creativos pagos por semana en Meta para la ruta.",
    "Activar TikTok orgánico donde LATAM está ausente (POV/vlog).",
    "Programar las piezas clave de martes a jueves por la mañana.",
    "Monitorear y responder el hilo negativo de Wingo en Reddit.",
  ],
};

export const DEMO_ANALYSIS_BY_SECTION: Record<string, typeof DEMO_ANALYSIS> = {
  overview: DEMO_ANALYSIS,
  comparativa: {
    headline: "La ventaja de Avianca es de volumen, no de eficiencia.",
    body: "La matriz muestra a Avianca al frente en menciones, engagement y reach, pero su sentimiento positivo está apenas por encima del de Copa. Wingo y Arajet compiten por precio con bajo gasto pago. Copa sostiene un sentimiento positivo con la menor inversión: su desafío no es la percepción, sino la presencia.",
    takeaways: [
      "Avianca lidera todas las métricas de magnitud, pero no de sentimiento.",
      "Copa iguala a Avianca en sentimiento con una fracción del volumen.",
      "Wingo y Arajet juegan a precio, casi sin pauta.",
      "LATAM muestra sentimiento mixto: oportunidad de contraste.",
    ],
    recommendations: [
      "Comunicar la afinidad de marca como diferencial frente a Avianca.",
      "Cerrar la brecha de presencia con cadencia, no con descuentos.",
      "Vigilar el sentimiento mixto de LATAM para capitalizarlo.",
    ],
  },
  "live-feed": {
    headline: "Conversación mayormente positiva y orgánica; el riesgo está en Reddit.",
    body: "El stream está dominado por contenido orgánico de tono positivo (atardeceres, POVs, vlogs). La señal negativa se concentra en Reddit, donde un hilo sobre cambios de horario de Wingo escala. Los anuncios de Avianca y LATAM marcan presencia paga constante.",
    takeaways: [
      "Predomina el contenido orgánico positivo en IG/TikTok.",
      "Reddit concentra la conversación negativa (cambios de horario).",
      "Avianca y LATAM mantienen pauta activa visible en el feed.",
      "Copa aparece con buen engagement orgánico.",
    ],
    recommendations: [
      "Responder el hilo de Reddit con info de cambios y compensaciones.",
      "Amplificar el contenido orgánico positivo de mayor engagement.",
      "Monitorear nuevos anuncios pagos de la competencia.",
    ],
  },
  galeria: {
    headline: "Avianca y LATAM apuestan al paid; el orgánico vive en TikTok.",
    body: "La galería separa con claridad orgánico vs pago: Avianca y LATAM concentran el grueso de los creativos de Meta Ad Library (USD 18–28k estimados), mientras el contenido orgánico de mayor alcance vive en TikTok. Copa tiene poca presencia paga.",
    takeaways: [
      "Avianca y LATAM dominan el inventario de anuncios pagos.",
      "El orgánico de mayor alcance está en TikTok.",
      "Copa: baja presencia en Meta Ad Library.",
      "Los formatos de video superan a las fotos en alcance.",
    ],
    recommendations: [
      "Testear 1–2 creativos de video en Meta para la ruta.",
      "Priorizar formato video/POV en el orgánico.",
      "Evaluar igualar selectivamente la cadencia paga de Avianca.",
    ],
  },
  swot: {
    headline: "Copa juega de eficiencia, no de volumen: ganar SOV sin perder afinidad.",
    body: "El FODA muestra una marca con alta afinidad y bajo costo de presencia, pero con poca participación y casi sin pauta. La jugada inmediata está en TikTok orgánico (LATAM ausente) y en escalar paid de forma quirúrgica, protegiendo el sentimiento positivo que ya distingue a Copa.",
    takeaways: [
      "Fortaleza: mayor engagement orgánico por pieza de la categoría.",
      "Debilidad: SOV de 9,9% frente al 41,3% de Avianca.",
      "Oportunidad: TikTok orgánico libre y sentimiento mixto de LATAM.",
      "Amenaza: Avianca duplicó spend y hay guerra de tarifas.",
    ],
    recommendations: [
      "Act: TikTok orgánico + 1–2 creativos pagos por semana.",
      "React: responder Reddit y contraprogramar promos de tarifas.",
      "Roadmap: ver acciones corto/mediano/largo plazo abajo.",
    ],
  },
};

export const DEMO_PROJECT_SLUG = "cartagena-q2-2026";

// Cada run apunta a un `slug` de caso (lib/demo-cases.ts), así abrir un run
// muestra SUS marcas/menciones/comparativa/FODA y no siempre el caso Copa.
export const DEMO_RUNS = [
  { number: 42, slug: "cartagena-q2-2026", mentions: 18, cost: 1.84, when: "hace 12 min", title: "Copa · Cartagena Q2" },
  { number: 41, slug: "cartagena-q2-2026", mentions: 16, cost: 1.62, when: "ayer", title: "Copa · ruta Bogotá–SDQ" },
  { number: 40, slug: "moda-zara-hm", mentions: 24, cost: 2.1, when: "hace 3 d", title: "Moda · Zara vs H&M" },
  { number: 39, slug: "fintech-uala", mentions: 21, cost: 1.95, when: "hace 5 d", title: "Fintech · Ualá vs Brubank" },
  { number: 38, slug: "cafe-latam", mentions: 14, cost: 1.4, when: "hace 1 sem", title: "Café · especialidad LatAm" },
  { number: 37, slug: "belleza-natura", mentions: 26, cost: 1.66, when: "hace 2 sem", title: "Belleza · lanzamientos de serum" },
  { number: 36, slug: "belleza-natura", mentions: 19, cost: 1.78, when: "hace 3 sem", title: "Belleza · Natura vs L'Oréal" },
  { number: 35, slug: "moda-zara-hm", mentions: 23, cost: 2.18, when: "hace 3 sem", title: "Moda · drops de otoño" },
  { number: 34, slug: "fintech-uala", mentions: 15, cost: 1.5, when: "hace 1 mes", title: "Fintech · cuentas remuneradas" },
  { number: 33, slug: "deportiva-nike-adidas", mentions: 28, cost: 2.46, when: "hace 1 mes", title: "Deportiva · Nike vs adidas" },
  { number: 32, slug: "deportiva-nike-adidas", mentions: 12, cost: 1.22, when: "hace 5 sem", title: "Deportiva · lanzamientos Q1" },
];

// Proyectos = carpetas que agrupan runs (feature que maneja el usuario).
export const DEMO_PROJECTS = [
  { slug: "cartagena-q2-2026", name: "Copa · Cartagena Q2", category: "Aerolíneas", runs: 6, lastRun: "hace 12 min", budget: 30, accent: "var(--series-client)" },
  { slug: "belleza-natura", name: "Belleza · Natura vs L'Oréal", category: "Beauty", runs: 5, lastRun: "hace 3 sem", budget: 35, accent: "var(--series-1)" },
  { slug: "moda-zara-hm", name: "Moda · Zara vs H&M", category: "Retail / Moda", runs: 3, lastRun: "hace 3 d", budget: 25, accent: "var(--series-2)" },
  { slug: "fintech-uala", name: "Fintech · Ualá vs Brubank", category: "Fintech", runs: 2, lastRun: "hace 5 d", budget: 40, accent: "var(--series-3)" },
  { slug: "deportiva-nike-adidas", name: "Deportiva · Nike vs adidas", category: "Indumentaria", runs: 7, lastRun: "hace 1 mes", budget: 45, accent: "var(--series-4)" },
  { slug: "cafe-latam", name: "Café de especialidad LatAm", category: "Food & Bev", runs: 4, lastRun: "hace 1 sem", budget: 20, accent: "var(--series-1)" },
];
