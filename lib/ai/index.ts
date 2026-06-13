import "server-only";
import * as claude from "@/lib/ai/claude";
import * as grok from "@/lib/ai/grok";

// AI provider is configurable: AI_PROVIDER=claude (default) | grok.
const useGrok = (process.env.AI_PROVIDER ?? "claude").toLowerCase() === "grok";

export const scoreSentiments = useGrok ? grok.scoreSentiments : claude.scoreSentiments;
export const generateInsights = useGrok ? grok.generateInsights : claude.generateInsights;
export const scoreToSentiment = useGrok ? grok.scoreToSentiment : claude.scoreToSentiment;
export type InsightDraft = claude.InsightDraft;
