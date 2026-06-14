import type { Source, SourceQuery, SourceResult, RawMention } from "@/lib/sources/types";
import { env } from "@/lib/sources/types";
import type { PlatformKey } from "@/lib/platforms";

// xAI Grok Live Search — independent web / news / X search.
//   - x   → busca en X (Twitter), donde Grok es especialmente fuerte
//   - web → busca en la web abierta + portales de prensa (news)
// Determinista en mock (el runner usa fixtures); el fetch real sólo corre en live.
type Post = { author?: string; handle?: string; text?: string; url?: string; date?: string };

type LiveSourceType = { type: "x" | "web" | "news" };

function searchSources(platform: PlatformKey): LiveSourceType[] {
  if (platform === "x") return [{ type: "x" }];
  if (platform === "web") return [{ type: "web" }, { type: "news" }];
  return [{ type: "web" }];
}

function scope(platform: PlatformKey): string {
  return platform === "x" ? "X (Twitter)" : "la web abierta y portales de prensa";
}

export function grokLiveSource(platform: PlatformKey): Source {
  return {
    key: platform,
    label: `Grok live search · ${platform}`,
    available: () => Boolean(env("XAI_API_KEY")),
    async fetch(q: SourceQuery): Promise<SourceResult> {
      const key = env("XAI_API_KEY");
      if (!key) throw new Error("XAI_API_KEY no configurado");
      const terms = (q.keywords.length ? q.keywords : q.handles).slice(0, 6).join(", ");
      const fromDate = new Date(Date.now() - q.sinceDays * 86400000).toISOString().slice(0, 10);

      const res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: env("XAI_MODEL") ?? "grok-3",
          messages: [
            {
              role: "system",
              content:
                `Sos un analista de research competitivo haciendo un escaneo OBJETIVO y NEUTRAL de ${scope(platform)} sobre marcas y temas específicos, en nombre de una marca cliente que monitorea su mercado. ` +
                "IMPORTANTE: NO uses ninguna cuenta personal, timeline propio, personalización ni información del operador del API. Buscá únicamente contenido público de terceros sobre las marcas/temas indicados, de forma imparcial. " +
                "Devolvé SOLO un array JSON de objetos {author, handle, text, url, date} (date en ISO). Sin texto adicional.",
            },
            {
              role: "user",
              content: `Research competitivo de marca. Encontrá hasta ${q.limit} resultados públicos en ${scope(platform)} sobre estas marcas/temas: ${terms}. Posteriores a ${fromDate}. No personalices según ninguna cuenta; resultados objetivos del mercado.`,
            },
          ],
          search_parameters: {
            mode: "on",
            sources: searchSources(platform),
            from_date: fromDate,
            max_search_results: Math.min(25, q.limit),
          },
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`xAI ${res.status} — ${body.slice(0, 200)}`);
      }
      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const content = json.choices?.[0]?.message?.content ?? "";
      const start = content.search(/\[/);
      let posts: Post[] = [];
      if (start >= 0) {
        try {
          posts = JSON.parse(content.slice(start)) as Post[];
        } catch {
          posts = [];
        }
      }
      const mentions: RawMention[] = posts
        .filter((p) => p && (p.text || p.url))
        .slice(0, q.limit)
        .map((p, i) => ({
          platform,
          externalId: p.url ?? `${platform}:${i}:${(p.text ?? "").slice(0, 24)}`,
          author: p.author ?? p.handle ?? "—",
          handle: (p.handle ?? p.author ?? platform).replace(/^@/, ""),
          url: p.url,
          publishedAt: p.date,
          text: p.text ?? "",
          thumbType: platform === "web" ? "article" : undefined,
        }));
      return { mentions, cost: 0 };
    },
  };
}
