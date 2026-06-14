import type { Locale } from "@/lib/i18n";

// Brand-aware suggestion + assist engine for the home wizard.
// Mock-safe and deterministic (zero cost): detects the brand category from the
// free text and returns plausible suggestions per field. In a future live mode
// this can be swapped for a Claude call; the shape stays the same.

export type Category =
  | "airline"
  | "fashion"
  | "food"
  | "beauty"
  | "tech"
  | "fintech"
  | "auto"
  | "retail"
  | "generic";

const CAT_KEYWORDS: [Category, RegExp][] = [
  ["airline", /aerol[ií]ne|vuelo|ruta a[eé]rea|airline|aer[eo]|cartagena|copa|avianca|latam|wingo|arajet/i],
  ["fashion", /moda|ropa|indumentaria|fashion|prenda|calzado|zapatill|sneaker|tienda de ropa|textil/i],
  ["beauty", /belleza|cosm[eé]tic|skincare|maquillaje|beauty|perfum|dermo/i],
  ["food", /comida|restaurante|food|bebida|snack|gastronom|delivery|cerve|caf[eé]|helader/i],
  ["fintech", /banco|fintech|billetera|wallet|pago|cr[eé]dito|finanz|inversi[oó]n/i],
  ["tech", /software|app\b|saas|tecnolog|\btech\b|plataforma|startup|herramienta digital/i],
  ["auto", /autom[oó]vil|veh[ií]culo|\bmoto\b|automotriz|concesionari|\bcars?\b/i],
  ["retail", /retail|supermercado|ecommerce|comercio|marketplace|tienda online/i],
];

export function detectCategory(text: string): Category {
  const t = (text || "").toLowerCase();
  for (const [cat, re] of CAT_KEYWORDS) if (re.test(t)) return cat;
  return "generic";
}

type FieldSuggestions = { competitors: string[]; geo: string[]; discards: string[] };

const SUGGESTIONS: Record<Category, FieldSuggestions> = {
  airline: {
    competitors: ["Avianca", "LATAM", "Wingo", "Arajet", "JetSMART"],
    geo: ["Colombia", "Panamá", "Estados Unidos", "México"],
    discards: ["Política", "Deportes", "Religión"],
  },
  fashion: {
    competitors: ["Zara", "H&M", "Shein", "Mango", "Forever 21"],
    geo: ["Argentina", "México", "Colombia", "Chile"],
    discards: ["Política", "Religión", "Deportes"],
  },
  beauty: {
    competitors: ["L'Oréal", "Natura", "Sephora", "Avon", "MAC"],
    geo: ["México", "Brasil", "Argentina", "Colombia"],
    discards: ["Política", "Religión"],
  },
  food: {
    competitors: ["McDonald's", "Burger King", "Starbucks", "Mostaza", "Rappi"],
    geo: ["Argentina", "México", "Chile", "Colombia"],
    discards: ["Política", "Religión", "Deportes"],
  },
  fintech: {
    competitors: ["Mercado Pago", "Ualá", "Nubank", "Brubank", "Belo"],
    geo: ["Argentina", "Brasil", "México", "Colombia"],
    discards: ["Religión", "Deportes"],
  },
  tech: {
    competitors: ["Notion", "Slack", "Asana", "Monday", "Trello"],
    geo: ["Estados Unidos", "México", "Argentina", "España"],
    discards: ["Política", "Religión", "Deportes"],
  },
  auto: {
    competitors: ["Toyota", "Volkswagen", "Ford", "Chevrolet", "Renault"],
    geo: ["México", "Brasil", "Argentina", "Colombia"],
    discards: ["Política", "Religión"],
  },
  retail: {
    competitors: ["Mercado Libre", "Amazon", "Falabella", "Coppel", "Liverpool"],
    geo: ["México", "Argentina", "Chile", "Colombia"],
    discards: ["Política", "Religión", "Deportes"],
  },
  generic: {
    competitors: ["Competidor líder", "Retador #2", "Player regional"],
    geo: ["Argentina", "México", "Colombia"],
    discards: ["Política", "Religión", "Deportes"],
  },
};

export type SuggestField = keyof FieldSuggestions;

export function suggestFor(field: SuggestField, text: string): string[] {
  return SUGGESTIONS[detectCategory(text)][field];
}

type WizState = { brand: string; brandDesc: string; igUrl: string; problem: string; geo: string[]; competitors: string[]; discards: string[] };

// Localized assist copy (ES/EN/PT). Deterministic; the live model can replace it.
const ASSIST: Record<Locale, {
  s0_need: string; s0_desc: string; s0_ig: string; s0_ok: string;
  s1_geo: string; s1_comp: (geo: string) => string; s1_ok: (n: number, geo: string) => string; s2: string;
}> = {
  es: {
    s0_need: "Necesito al menos el nombre de tu marca y la pregunta de negocio para empezar el marco.",
    s0_desc: "Contame en una línea qué hacen — me ayuda a ubicar la categoría y sugerir competidores.",
    s0_ig: "Bien. Si sumás tu Instagram/web, el análisis pasa de competitivo a comparativo (tu marca vs. la categoría).",
    s0_ok: "Perfecto: con tu marca, qué hacen y tus redes puedo comparar tu desempeño contra la competencia.",
    s1_geo: "Decime al menos un mercado (país o ciudad) para no traer ruido de otros. ¿No sabés? Te sugiero.",
    s1_comp: (geo) => `Mercados ok (${geo}). Sumá 2+ competidores para una comparativa sólida — o te sugiero según tu categoría.`,
    s1_ok: (n, geo) => `Listo: ${n} competidores en ${geo}. Los descartes son opcionales para sacar ruido.`,
    s2: "Elegí dónde escuchar y la ventana. Orgánico mide la conversación; sumar paid revela cuánto y cómo invierte la competencia (anuncios).",
  },
  en: {
    s0_need: "I need at least your brand name and the business question to build the frame.",
    s0_desc: "Tell me in one line what you do — it helps me place the category and suggest competitors.",
    s0_ig: "Good. If you add your Instagram/site, the analysis goes from competitive to comparative (your brand vs. the category).",
    s0_ok: "Perfect: with your brand, what you do and your socials I can compare your performance against the competition.",
    s1_geo: "Give me at least one market (country or city) so we don't pull noise from others. Not sure? I'll suggest.",
    s1_comp: (geo) => `Markets OK (${geo}). Add 2+ competitors for a solid comparison — or I'll suggest based on your category.`,
    s1_ok: (n, geo) => `Done: ${n} competitors in ${geo}. Exclusions are optional to cut noise.`,
    s2: "Choose where to listen and the window. Organic measures the conversation; adding paid reveals how much and how the competition invests (ads).",
  },
  pt: {
    s0_need: "Preciso pelo menos do nome da sua marca e da pergunta de negócio para montar o marco.",
    s0_desc: "Conta em uma linha o que vocês fazem — ajuda a situar a categoria e sugerir concorrentes.",
    s0_ig: "Bom. Se você somar seu Instagram/site, a análise passa de competitiva a comparativa (sua marca vs. a categoria).",
    s0_ok: "Perfeito: com sua marca, o que fazem e suas redes posso comparar seu desempenho com a concorrência.",
    s1_geo: "Me diga pelo menos um mercado (país ou cidade) para não trazer ruído de outros. Não sabe? Eu sugiro.",
    s1_comp: (geo) => `Mercados OK (${geo}). Some 2+ concorrentes para um comparativo sólido — ou eu sugiro pela sua categoria.`,
    s1_ok: (n, geo) => `Pronto: ${n} concorrentes em ${geo}. Os descartes são opcionais para tirar ruído.`,
    s2: "Escolha onde escutar e a janela. Orgânico mede a conversa; somar pago revela quanto e como a concorrência investe (anúncios).",
  },
};

// Short assistant message per step (compact 3-step wizard + confirm).
export function assistFor(step: number, s: WizState, locale: Locale = "es"): { ok: boolean; msg: string } {
  const L = ASSIST[locale] ?? ASSIST.es;
  const geo = s.geo.join(", ");
  switch (step) {
    case 0:
      if (!s.brand.trim() || !s.problem.trim()) return { ok: false, msg: L.s0_need };
      if (!s.brandDesc.trim()) return { ok: false, msg: L.s0_desc };
      if (!s.igUrl.trim()) return { ok: true, msg: L.s0_ig };
      return { ok: true, msg: L.s0_ok };
    case 1:
      if (!s.geo.length) return { ok: false, msg: L.s1_geo };
      if (s.competitors.length < 2) return { ok: false, msg: L.s1_comp(geo) };
      return { ok: true, msg: L.s1_ok(s.competitors.length, geo) };
    case 2:
      return { ok: true, msg: L.s2 };
    default:
      return { ok: true, msg: "" };
  }
}

const REC: Record<Locale, {
  r0_desc: string; r0_ig: string; r0_problem: string; r0_ok: string;
  r1_geo: string; r1_comp: (sug: string) => string; r1_disc: (d: string) => string; r1_ok: string;
  r2_a: string; r2_b: string; r2_c: string;
}> = {
  es: {
    r0_desc: "Agregá en una línea qué hace tu marca: ubica la categoría y afina las sugerencias de competidores.",
    r0_ig: "Sumá tu Instagram o sitio: el análisis pasa de competitivo a comparativo (tu marca vs. la categoría).",
    r0_problem: "Hacé la pregunta de negocio más específica: qué decisión querés tomar con el reporte.",
    r0_ok: "Brief sólido. Con esto puedo armar un marco comparativo claro.",
    r1_geo: "Definí al menos un mercado (país o ciudad) para no traer ruido de otros.",
    r1_comp: (sug) => `Sumá 2+ competidores directos para una comparativa sólida${sug ? ` (ej: ${sug})` : ""}.`,
    r1_disc: (d) => `Conviene descartar temas que ensucian el corpus${d ? `: ${d}` : " (política, deportes, religión)"}.`,
    r1_ok: "Competencia y mercados bien definidos: la comparativa va a rendir.",
    r2_a: "Si te interesa cuánto y cómo invierte la competencia, elegí 'Orgánico + paid'.",
    r2_b: "Dejá activas sólo las redes donde tu categoría realmente conversa: acota costo y ruido.",
    r2_c: "Una ventana de 60–90 días da buena señal sin diluir tendencias.",
  },
  en: {
    r0_desc: "Add one line on what your brand does: it places the category and sharpens competitor suggestions.",
    r0_ig: "Add your Instagram or site: the analysis goes from competitive to comparative (your brand vs. the category).",
    r0_problem: "Make the business question more specific: what decision you want to make with the report.",
    r0_ok: "Solid brief. With this I can build a clear comparative frame.",
    r1_geo: "Define at least one market (country or city) so we don't pull noise from others.",
    r1_comp: (sug) => `Add 2+ direct competitors for a solid comparison${sug ? ` (e.g., ${sug})` : ""}.`,
    r1_disc: (d) => `It's worth excluding topics that pollute the corpus${d ? `: ${d}` : " (politics, sports, religion)"}.`,
    r1_ok: "Competitors and markets well defined: the comparison will deliver.",
    r2_a: "If you care how much and how the competition invests, choose 'Organic + paid'.",
    r2_b: "Keep only the networks where your category actually talks: cuts cost and noise.",
    r2_c: "A 60–90 day window gives good signal without diluting trends.",
  },
  pt: {
    r0_desc: "Adicione uma linha sobre o que sua marca faz: situa a categoria e refina as sugestões de concorrentes.",
    r0_ig: "Some seu Instagram ou site: a análise passa de competitiva a comparativa (sua marca vs. a categoria).",
    r0_problem: "Deixe a pergunta de negócio mais específica: que decisão você quer tomar com o relatório.",
    r0_ok: "Brief sólido. Com isso posso montar um marco comparativo claro.",
    r1_geo: "Defina pelo menos um mercado (país ou cidade) para não trazer ruído de outros.",
    r1_comp: (sug) => `Some 2+ concorrentes diretos para um comparativo sólido${sug ? ` (ex.: ${sug})` : ""}.`,
    r1_disc: (d) => `Vale descartar temas que sujam o corpus${d ? `: ${d}` : " (política, esportes, religião)"}.`,
    r1_ok: "Concorrentes e mercados bem definidos: o comparativo vai render.",
    r2_a: "Se te interessa quanto e como a concorrência investe, escolha 'Orgânico + pago'.",
    r2_b: "Deixe ativas só as redes onde sua categoria realmente conversa: reduz custo e ruído.",
    r2_c: "Uma janela de 60–90 dias dá bom sinal sem diluir tendências.",
  },
};

// A recommendation anchored to the field it refers to (for the wizard bubbles).
export type Rec = { field: string; text: string };

// Concrete, actionable recommendations per step — shown as mention-style bubbles
// next to the relevant field. Context-aware: uses everything loaded so far
// (brand + desc + problem + competitors) so suggestions stay on-category.
export function recommendationsFor(step: number, s: WizState, locale: Locale = "es"): Rec[] {
  const L = REC[locale] ?? REC.es;
  const ctx = `${s.brand} ${s.brandDesc} ${s.problem} ${s.competitors.join(" ")}`;
  const recs: Rec[] = [];
  if (step === 0) {
    if (!s.brandDesc.trim()) recs.push({ field: "desc", text: L.r0_desc });
    if (!s.igUrl.trim()) recs.push({ field: "ig", text: L.r0_ig });
    if (s.problem.trim().length < 24) recs.push({ field: "problem", text: L.r0_problem });
    if (!recs.length) recs.push({ field: "brand", text: L.r0_ok });
  } else if (step === 1) {
    if (!s.geo.length) recs.push({ field: "markets", text: L.r1_geo });
    if (s.competitors.length < 2) recs.push({ field: "competitors", text: L.r1_comp(suggestFor("competitors", ctx).slice(0, 3).join(", ")) });
    if (!s.discards.length) recs.push({ field: "discards", text: L.r1_disc(suggestFor("discards", ctx).slice(0, 3).join(", ")) });
    if (!recs.length) recs.push({ field: "competitors", text: L.r1_ok });
  } else if (step === 2) {
    recs.push({ field: "scope", text: L.r2_a }, { field: "networks", text: L.r2_b }, { field: "window", text: L.r2_c });
  }
  return recs.slice(0, 3);
}
