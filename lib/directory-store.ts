import { useEffect, useState } from "react";
import { DEMO_ACCOUNTS, type DirAccount, type DirProject } from "@/lib/accounts";

// Client-side directory store (no backend yet): seeded from DEMO_ACCOUNTS and
// persisted in localStorage so the user can create/delete accounts and projects
// in the demo. Synced across mounted views via a window event.
const KEY = "phatia_directory";
const EVENT = "phatia:dir-changed";
const ACCENTS = ["var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--series-4)"];

const clone = (a: DirAccount[]): DirAccount[] => JSON.parse(JSON.stringify(a));

export function loadDirectory(): DirAccount[] {
  if (typeof window === "undefined") return clone(DEMO_ACCOUNTS);
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as DirAccount[];
  } catch {
    /* ignore */
  }
  return clone(DEMO_ACCOUNTS);
}

function persist(accts: DirAccount[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(accts));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* ignore */
  }
}

function slugify(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || `x-${Date.now()}`;
}
function uniqueSlug(base: string, taken: Set<string>): string {
  let s = base;
  let i = 2;
  while (taken.has(s)) s = `${base}-${i++}`;
  return s;
}

export function findAccount(accounts: DirAccount[], slug: string): DirAccount | undefined {
  return accounts.find((a) => a.slug === slug);
}
export function findProject(accounts: DirAccount[], slug: string): { account: DirAccount; project: DirProject } | undefined {
  for (const a of accounts) {
    const project = a.projects.find((p) => p.slug === slug);
    if (project) return { account: a, project };
  }
  return undefined;
}

export function useDirectory() {
  // SSR-stable initial state (seed); localStorage is read after mount.
  const [accounts, setAccounts] = useState<DirAccount[]>(() => clone(DEMO_ACCOUNTS));

  useEffect(() => {
    const sync = () => setAccounts(loadDirectory());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const commit = (next: DirAccount[]) => { setAccounts(next); persist(next); };

  function addAccount(name: string, industry: string, color?: string): string {
    const taken = new Set(accounts.map((a) => a.slug));
    const slug = uniqueSlug(slugify(name), taken);
    const acc: DirAccount = {
      slug,
      name: name.trim(),
      letter: (name.trim()[0] || "?").toUpperCase(),
      accent: color || ACCENTS[accounts.length % ACCENTS.length],
      // Free-text industry stored as-is; t() returns it verbatim when not a key.
      industryKey: industry.trim() || "—",
      projects: [],
    };
    commit([acc, ...accounts]);
    return slug;
  }
  function removeAccount(slug: string) {
    commit(accounts.filter((a) => a.slug !== slug));
  }
  function addProject(accountSlug: string, name: string): string {
    const taken = new Set(accounts.flatMap((a) => a.projects.map((p) => p.slug)));
    const slug = uniqueSlug(slugify(name), taken);
    const project: DirProject = { slug, name: name.trim(), caseSlug: "", budget: 30, runs: [] };
    commit(accounts.map((a) => (a.slug === accountSlug ? { ...a, projects: [project, ...a.projects] } : a)));
    return slug;
  }
  function removeProject(accountSlug: string, projectSlug: string) {
    commit(accounts.map((a) => (a.slug === accountSlug ? { ...a, projects: a.projects.filter((p) => p.slug !== projectSlug) } : a)));
  }

  return { accounts, addAccount, removeAccount, addProject, removeProject };
}
