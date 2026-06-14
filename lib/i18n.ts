// Lightweight i18n (ES/EN/PT). Client UI strings via a flat dictionary + t().
// The locale lives in a cookie (phema_locale) + localStorage so SSR and client
// agree. Seed/demo content (analysis, mentions) is localized separately.

export type Locale = "es" | "en" | "pt";
export const LOCALES: Locale[] = ["es", "en", "pt"];
export const DEFAULT_LOCALE: Locale = "es";
export const LOCALE_LABEL: Record<Locale, string> = { es: "Español", en: "English", pt: "Português" };

export function isLocale(v: unknown): v is Locale {
  return v === "es" || v === "en" || v === "pt";
}

type Dict = Record<string, string>;

const es: Dict = {
  // common
  "common.generateReport": "Generar reporte",
  "common.demo": "Demo",
  "common.viewAll": "Ver todos →",
  "common.openMenu": "Abrir menú",
  "common.closeMenu": "Cerrar menú",
  "common.language": "Idioma",
  // marketing nav
  "nav.product": "Producto",
  "nav.how": "Cómo funciona",
  "nav.reports": "Reportes",
  "nav.faq": "FAQ",
  // hero
  "hero.eyebrow": "Inteligencia competitiva · Social listening",
  "hero.titleBefore": "¿Qué querés investigar ",
  "hero.titleEm": "hoy",
  "hero.titleAfter": "?",
  "hero.lead": "Describí tu pregunta de negocio. Armamos el marco, estimamos el costo y producimos un reporte que se vende.",
  "hero.placeholder": "Ej: {ex}…",
  "hero.aria": "¿Qué querés investigar hoy?",
  "hero.start": "Empezar investigación",
  "hero.ex0": "una nueva ruta a Cartagena",
  "hero.ex1": "las tarifas que publicita Avianca",
  "hero.ex2": "el lanzamiento de clase ejecutiva",
  "hero.ex3": "qué se dice en X sobre los retrasos",
  "hero.ex4": "el contenido orgánico vs pago de la competencia",
  "hero.recentRuns": "Runs recientes",
  "hero.investigation": "Investigación",
  // process
  "process.eyebrow": "Cómo funciona",
  "process.title": "Una secuencia real, de la pregunta al reporte.",
  "process.step": "paso",
  "process.s1t": "Definí el marco",
  "process.s1b": "Problema de negocio, competidores con filtros por magnitud, alcance y fechas.",
  "process.s2t": "Descubrimos y scrapeamos",
  "process.s2b": "Handles reales y multi-fuente: redes, prensa y anuncios, en un solo barrido.",
  "process.s3t": "Análisis + insights",
  "process.s3b": "Texto, imagen, video y voiceover; sentimiento, ángulos y patrones por competidor.",
  "process.s4t": "Reporte exportable",
  "process.s4b": "El entregable que se vende —PDF y presentación— listo en un clic.",
  // faq
  "faq.eyebrow": "Preguntas",
  "faq.title": "Lo esencial, sin vueltas.",
  "faq.q1": "¿De dónde salen los datos?",
  "faq.a1": "De fuentes públicas: redes sociales, prensa y bibliotecas de anuncios. Usamos los handles reales de cada competidor y un barrido multi-fuente; nada se inventa.",
  "faq.q2": "¿Cuánto cuesta un run?",
  "faq.a2": "Lo ves antes de empezar. El asistente estima un rango (bajo–alto) por fuente y por análisis, y el run nunca supera el presupuesto que fijás.",
  "faq.q3": "¿Qué incluye el análisis?",
  "faq.a3": "Texto, imagen, video y voiceover. Detecta sentimiento, ángulos creativos y patrones por competidor, y los resume en takeaways y recomendaciones accionables.",
  "faq.q4": "¿Puedo revisar runs anteriores?",
  "faq.a4": "Sí. Cada run queda guardado y es revisitable, con su reporte exportable a PDF o presentación.",
  // footer
  "footer.cta": "Generá tu reporte →",
  "footer.meta": "Phema · Inteligencia de marca, presentable.",
  // shell nav
  "shell.nav.projects": "Proyectos",
  "shell.nav.overview": "Overview",
  "shell.nav.livefeed": "Live feed",
  "shell.nav.comparativa": "Comparativa",
  "shell.nav.gallery": "Galería",
  "shell.nav.swot": "FODA & Estrategia",
  "shell.nav.editor": "Editor de reporte",
  "shell.nav.settings": "Settings",
  // shell header
  "shell.search": "Buscar en el run…",
  "shell.presentation": "Presentación",
  "shell.newRun": "Nuevo run",
  "shell.home": "Phema · inicio",
};

const en: Dict = {
  "common.generateReport": "Generate report",
  "common.demo": "Demo",
  "common.viewAll": "View all →",
  "common.openMenu": "Open menu",
  "common.closeMenu": "Close menu",
  "common.language": "Language",
  "nav.product": "Product",
  "nav.how": "How it works",
  "nav.reports": "Reports",
  "nav.faq": "FAQ",
  "hero.eyebrow": "Competitive intelligence · Social listening",
  "hero.titleBefore": "What do you want to research ",
  "hero.titleEm": "today",
  "hero.titleAfter": "?",
  "hero.lead": "Describe your business question. We build the frame, estimate the cost and produce a report that sells.",
  "hero.placeholder": "E.g., {ex}…",
  "hero.aria": "What do you want to research today?",
  "hero.start": "Start research",
  "hero.ex0": "a new route to Cartagena",
  "hero.ex1": "the fares Avianca advertises",
  "hero.ex2": "the business class launch",
  "hero.ex3": "what people say on X about delays",
  "hero.ex4": "competitors' organic vs paid content",
  "hero.recentRuns": "Recent runs",
  "hero.investigation": "Research",
  "process.eyebrow": "How it works",
  "process.title": "A real sequence, from question to report.",
  "process.step": "step",
  "process.s1t": "Define the frame",
  "process.s1b": "Business problem, competitors filtered by magnitude, scope and dates.",
  "process.s2t": "We discover and scrape",
  "process.s2b": "Real handles, multi-source: social, press and ads in a single sweep.",
  "process.s3t": "Analysis + insights",
  "process.s3b": "Text, image, video and voiceover; sentiment, angles and patterns per competitor.",
  "process.s4t": "Exportable report",
  "process.s4b": "The deliverable that sells —PDF and deck— ready in one click.",
  "faq.eyebrow": "Questions",
  "faq.title": "The essentials, no fluff.",
  "faq.q1": "Where does the data come from?",
  "faq.a1": "From public sources: social media, press and ad libraries. We use each competitor's real handles and a multi-source sweep; nothing is made up.",
  "faq.q2": "How much does a run cost?",
  "faq.a2": "You see it before you start. The assistant estimates a range (low–high) per source and per analysis, and a run never exceeds the budget you set.",
  "faq.q3": "What does the analysis include?",
  "faq.a3": "Text, image, video and voiceover. It detects sentiment, creative angles and patterns per competitor, and sums them up into takeaways and actionable recommendations.",
  "faq.q4": "Can I review past runs?",
  "faq.a4": "Yes. Every run is saved and revisitable, with its report exportable to PDF or deck.",
  "footer.cta": "Generate your report →",
  "footer.meta": "Phema · Brand intelligence, presentable.",
  "shell.nav.projects": "Projects",
  "shell.nav.overview": "Overview",
  "shell.nav.livefeed": "Live feed",
  "shell.nav.comparativa": "Comparison",
  "shell.nav.gallery": "Gallery",
  "shell.nav.swot": "SWOT & Strategy",
  "shell.nav.editor": "Report editor",
  "shell.nav.settings": "Settings",
  "shell.search": "Search in this run…",
  "shell.presentation": "Presentation",
  "shell.newRun": "New run",
  "shell.home": "Phema · home",
};

const pt: Dict = {
  "common.generateReport": "Gerar relatório",
  "common.demo": "Demo",
  "common.viewAll": "Ver todos →",
  "common.openMenu": "Abrir menu",
  "common.closeMenu": "Fechar menu",
  "common.language": "Idioma",
  "nav.product": "Produto",
  "nav.how": "Como funciona",
  "nav.reports": "Relatórios",
  "nav.faq": "FAQ",
  "hero.eyebrow": "Inteligência competitiva · Social listening",
  "hero.titleBefore": "O que você quer pesquisar ",
  "hero.titleEm": "hoje",
  "hero.titleAfter": "?",
  "hero.lead": "Descreva sua pergunta de negócio. Montamos o marco, estimamos o custo e produzimos um relatório que vende.",
  "hero.placeholder": "Ex.: {ex}…",
  "hero.aria": "O que você quer pesquisar hoje?",
  "hero.start": "Iniciar pesquisa",
  "hero.ex0": "uma nova rota para Cartagena",
  "hero.ex1": "as tarifas que a Avianca anuncia",
  "hero.ex2": "o lançamento da classe executiva",
  "hero.ex3": "o que dizem no X sobre os atrasos",
  "hero.ex4": "o conteúdo orgânico vs pago da concorrência",
  "hero.recentRuns": "Runs recentes",
  "hero.investigation": "Pesquisa",
  "process.eyebrow": "Como funciona",
  "process.title": "Uma sequência real, da pergunta ao relatório.",
  "process.step": "passo",
  "process.s1t": "Defina o marco",
  "process.s1b": "Problema de negócio, concorrentes com filtros por magnitude, alcance e datas.",
  "process.s2t": "Descobrimos e coletamos",
  "process.s2b": "Handles reais e multi-fonte: redes, imprensa e anúncios, numa só varredura.",
  "process.s3t": "Análise + insights",
  "process.s3b": "Texto, imagem, vídeo e voiceover; sentimento, ângulos e padrões por concorrente.",
  "process.s4t": "Relatório exportável",
  "process.s4b": "O entregável que vende —PDF e apresentação— pronto num clique.",
  "faq.eyebrow": "Perguntas",
  "faq.title": "O essencial, sem rodeios.",
  "faq.q1": "De onde vêm os dados?",
  "faq.a1": "De fontes públicas: redes sociais, imprensa e bibliotecas de anúncios. Usamos os handles reais de cada concorrente e uma varredura multi-fonte; nada é inventado.",
  "faq.q2": "Quanto custa um run?",
  "faq.a2": "Você vê antes de começar. O assistente estima uma faixa (baixa–alta) por fonte e por análise, e o run nunca ultrapassa o orçamento que você define.",
  "faq.q3": "O que inclui a análise?",
  "faq.a3": "Texto, imagem, vídeo e voiceover. Detecta sentimento, ângulos criativos e padrões por concorrente, e resume em takeaways e recomendações acionáveis.",
  "faq.q4": "Posso revisar runs anteriores?",
  "faq.a4": "Sim. Cada run fica salvo e pode ser revisitado, com seu relatório exportável para PDF ou apresentação.",
  "footer.cta": "Gere seu relatório →",
  "footer.meta": "Phema · Inteligência de marca, apresentável.",
  "shell.nav.projects": "Projetos",
  "shell.nav.overview": "Visão geral",
  "shell.nav.livefeed": "Live feed",
  "shell.nav.comparativa": "Comparativo",
  "shell.nav.gallery": "Galeria",
  "shell.nav.swot": "SWOT & Estratégia",
  "shell.nav.editor": "Editor de relatório",
  "shell.nav.settings": "Configurações",
  "shell.search": "Buscar no run…",
  "shell.presentation": "Apresentação",
  "shell.newRun": "Novo run",
  "shell.home": "Phema · início",
};

const MESSAGES: Record<Locale, Dict> = { es, en, pt };

export type TFn = (key: string, vars?: Record<string, string | number>) => string;

export function makeT(locale: Locale): TFn {
  const table = MESSAGES[locale] ?? es;
  return (key, vars) => {
    let s = table[key] ?? es[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
    return s;
  };
}
