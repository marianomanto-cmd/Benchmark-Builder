// Media pipeline config — reuses the cost engine's mode/key gates so the same
// three-condition rule applies (PIPELINE_MODE=live + provider flag + key).
export { pipelineMode, hasProviderKey, LIMITS } from "@/lib/cost/config";

// Downloaded media is short-lived: deleted 12h after download (privacy + cost).
export const MEDIA_TTL_HOURS = 12;

export function mediaExpiresAt(): string {
  return new Date(Date.now() + MEDIA_TTL_HOURS * 3600_000).toISOString();
}
