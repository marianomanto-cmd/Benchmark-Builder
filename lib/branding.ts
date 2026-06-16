// White-label branding — pure & client-safe (types + defaults + plan gate). The
// server fetch/save live in lib/branding-server.ts (service role + Storage).

export type Branding = { brandName: string; logoUrl: string; accentHex: string; hidePhatiaFooter: boolean };

export const DEFAULT_BRANDING: Branding = {
  brandName: "Phatia",
  logoUrl: "/brand/logo.jpg",
  accentHex: "#c1123f",
  hidePhatiaFooter: false,
};

// Whether the current plan may hide the "Generado con Phatia" footer.
// TODO(plan): read the real plan entitlement (lib/credits). Stubbed `true` so the
// feature is usable in demo; the upsell path is wired for when this returns false.
export function planAllowsWhiteLabel(): boolean {
  return true;
}
