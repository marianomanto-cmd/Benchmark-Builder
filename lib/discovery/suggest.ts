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

// Short "AI assistant" message per step: tells the user whether what they gave
// is enough for the analysis, or what would sharpen it. Deterministic.
export function assistFor(
  step: number,
  s: { brand: string; brandDesc: string; igUrl: string; problem: string; geo: string[]; competitors: string[]; discards: string[] },
): { ok: boolean; msg: string } {
  switch (step) {
    case 0: {
      if (!s.brand.trim() || !s.problem.trim())
        return { ok: false, msg: "Necesito al menos el nombre de tu marca y la pregunta de negocio para empezar el marco." };
      if (!s.brandDesc.trim())
        return { ok: false, msg: "Contame en una línea qué hacen — me ayuda a ubicar la categoría y sugerir competidores." };
      if (!s.igUrl.trim())
        return { ok: true, msg: "Bien. Si sumás tu Instagram/web, el análisis pasa de competitivo a comparativo (tu marca vs. la categoría)." };
      return { ok: true, msg: "Perfecto: con tu marca, qué hacen y tus redes puedo comparar tu desempeño contra la competencia." };
    }
    case 1:
      return s.geo.length
        ? { ok: true, msg: `Voy a acotar la escucha a ${s.geo.join(", ")}. Podés sumar o quitar mercados.` }
        : { ok: false, msg: "Decime al menos un país o ciudad para no traer ruido de otros mercados. ¿No sabés? Te sugiero." };
    case 2:
      return s.competitors.length >= 2
        ? { ok: true, msg: `${s.competitors.length} competidores cargados — suficiente para una comparativa sólida.` }
        : { ok: false, msg: "Con 2+ competidores la comparativa rinde mucho más. Si no los tenés claros, te sugiero según tu categoría." };
    case 3:
      return { ok: true, msg: "Orgánico mide la conversación; sumar paid revela cuánto y cómo invierte la competencia (bibliotecas de anuncios)." };
    case 4:
      return s.discards.length
        ? { ok: true, msg: `Voy a descartar menciones de ${s.discards.join(", ")} para que el análisis quede limpio.` }
        : { ok: true, msg: "Opcional: descartar temas (política, deportes, religión) saca ruido si tu marca aparece en esos contextos." };
    case 5:
      return { ok: true, msg: "Una ventana de 30–90 días suele dar buena señal sin diluir tendencias. 60 días es un buen default." };
    default:
      return { ok: true, msg: "" };
  }
}
