import { DEMO_RUNS } from "@/lib/demo";

// User directory model: the marketer's Accounts (clients) → Projects (studies)
// → Runs. Derived from the existing seed cases so the demo is coherent.

export type DirRun = { number: number; slug: string; mentions: number; cost: number; when: string; title?: string };
export type DirProject = { slug: string; name: string; caseSlug: string; budget: number; runs: DirRun[] };
export type DirAccount = { slug: string; name: string; letter: string; accent: string; industryKey: string; projects: DirProject[] };

const runsFor = (caseSlug: string): DirRun[] => DEMO_RUNS.filter((r) => r.slug === caseSlug);

export const DEMO_ACCOUNTS: DirAccount[] = [
  {
    slug: "copa", name: "Copa Airlines", letter: "C", accent: "var(--series-1)", industryKey: "dash.ind.airline",
    projects: [
      { slug: "cartagena-q2-2026", name: "Cartagena · Q2 2026", caseSlug: "cartagena-q2-2026", budget: 30, runs: runsFor("cartagena-q2-2026") },
    ],
  },
  {
    slug: "natura", name: "Natura", letter: "N", accent: "var(--series-2)", industryKey: "dash.ind.beauty",
    projects: [
      { slug: "belleza-natura", name: "Natura vs L'Oréal", caseSlug: "belleza-natura", budget: 35, runs: runsFor("belleza-natura") },
    ],
  },
  {
    slug: "zara", name: "Zara", letter: "Z", accent: "var(--series-3)", industryKey: "dash.ind.fashion",
    projects: [
      { slug: "moda-zara-hm", name: "Zara vs H&M", caseSlug: "moda-zara-hm", budget: 25, runs: runsFor("moda-zara-hm") },
    ],
  },
  {
    slug: "uala", name: "Ualá", letter: "U", accent: "var(--series-4)", industryKey: "dash.ind.fintech",
    projects: [
      { slug: "fintech-uala", name: "Ualá vs Brubank", caseSlug: "fintech-uala", budget: 40, runs: runsFor("fintech-uala") },
    ],
  },
  {
    slug: "nike", name: "Nike", letter: "N", accent: "var(--series-1)", industryKey: "dash.ind.sportswear",
    projects: [
      { slug: "deportiva-nike-adidas", name: "Nike vs adidas", caseSlug: "deportiva-nike-adidas", budget: 45, runs: runsFor("deportiva-nike-adidas") },
    ],
  },
  {
    slug: "juanvaldez", name: "Juan Valdez", letter: "J", accent: "var(--series-2)", industryKey: "dash.ind.coffee",
    projects: [
      { slug: "cafe-latam", name: "Café de especialidad", caseSlug: "cafe-latam", budget: 20, runs: runsFor("cafe-latam") },
    ],
  },
];

export function allRuns(): DirRun[] {
  return DEMO_ACCOUNTS.flatMap((a) => a.projects.flatMap((p) => p.runs));
}

export function userStats() {
  const runs = allRuns();
  return {
    accounts: DEMO_ACCOUNTS.length,
    projects: DEMO_ACCOUNTS.reduce((a, acc) => a + acc.projects.length, 0),
    runs: runs.length,
    spend: Math.round(runs.reduce((a, r) => a + r.cost, 0) * 100) / 100,
    mentions: runs.reduce((a, r) => a + r.mentions, 0),
  };
}

// Recent activity across all accounts, newest first.
export function recentActivity(n = 6): Array<DirRun & { account: string; accent: string }> {
  const rows = DEMO_ACCOUNTS.flatMap((a) =>
    a.projects.flatMap((p) => p.runs.map((r) => ({ ...r, account: a.name, accent: a.accent }))),
  );
  return rows.sort((x, y) => y.number - x.number).slice(0, n);
}

export function accountStats(a: DirAccount) {
  const runs = a.projects.flatMap((p) => p.runs);
  return {
    projects: a.projects.length,
    runs: runs.length,
    spend: Math.round(runs.reduce((s, r) => s + r.cost, 0) * 100) / 100,
    lastRun: runs[0]?.when ?? "—",
  };
}

export function getAccount(slug: string): DirAccount | undefined {
  return DEMO_ACCOUNTS.find((a) => a.slug === slug);
}

// Find a project (by its slug) along with the account it belongs to.
export function getProject(slug: string): { account: DirAccount; project: DirProject } | undefined {
  for (const a of DEMO_ACCOUNTS) {
    const project = a.projects.find((p) => p.slug === slug);
    if (project) return { account: a, project };
  }
  return undefined;
}

export function projectStats(p: DirProject) {
  return {
    runs: p.runs.length,
    spend: Math.round(p.runs.reduce((s, r) => s + r.cost, 0) * 100) / 100,
    mentions: p.runs.reduce((s, r) => s + r.mentions, 0),
    lastRun: p.runs[0]?.when ?? "—",
  };
}
