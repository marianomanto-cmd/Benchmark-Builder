import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_BRANDING, type Branding } from "@/lib/branding";

// Server-side branding: read (with Phatia fallback) + save (service role) +
// logo upload to the public "branding" Storage bucket. Singleton row until auth.

function toBranding(d: { brand_name: string | null; logo_url: string | null; accent_hex: string | null; hide_phatia_footer: boolean }): Branding {
  return {
    brandName: d.brand_name || DEFAULT_BRANDING.brandName,
    logoUrl: d.logo_url || DEFAULT_BRANDING.logoUrl,
    accentHex: d.accent_hex || DEFAULT_BRANDING.accentHex,
    hidePhatiaFooter: !!d.hide_phatia_footer,
  };
}

export async function getBranding(): Promise<Branding> {
  try {
    const client = createAdminClient() ?? (await createClient());
    const { data } = await client.from("workspace_branding").select("brand_name, logo_url, accent_hex, hide_phatia_footer").limit(1).maybeSingle();
    return data ? toBranding(data) : DEFAULT_BRANDING;
  } catch {
    return DEFAULT_BRANDING;
  }
}

// Decode a data URL and upload it to the branding bucket; returns the public URL.
async function uploadLogo(dataUrl: string): Promise<string | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  const mime = m[1];
  const ext = mime.includes("png") ? "png" : mime.includes("svg") ? "svg" : mime.includes("webp") ? "webp" : "jpg";
  const bytes = Buffer.from(m[2], "base64");
  const path = `logo-${Date.now()}.${ext}`;
  const { error } = await admin.storage.from("branding").upload(path, bytes, { contentType: mime, upsert: true });
  if (error) return null;
  return admin.storage.from("branding").getPublicUrl(path).data.publicUrl;
}

export async function saveBranding(args: { brandName?: string; accentHex?: string; hidePhatiaFooter?: boolean; logoDataUrl?: string }): Promise<{ ok: boolean; branding: Branding }> {
  const admin = createAdminClient();
  if (!admin) return { ok: false, branding: DEFAULT_BRANDING };
  try {
    let logoUrl: string | undefined;
    if (args.logoDataUrl) logoUrl = (await uploadLogo(args.logoDataUrl)) ?? args.logoDataUrl; // fall back to inlining

    const { data: existing } = await admin.from("workspace_branding").select("id").is("account_id", null).limit(1).maybeSingle();
    const patch = {
      brand_name: args.brandName ?? null,
      accent_hex: args.accentHex ?? null,
      hide_phatia_footer: args.hidePhatiaFooter ?? false,
      ...(logoUrl ? { logo_url: logoUrl } : {}),
      updated_at: new Date().toISOString(),
    };
    if (existing) await admin.from("workspace_branding").update(patch).eq("id", existing.id);
    else await admin.from("workspace_branding").insert(patch);

    return { ok: true, branding: await getBranding() };
  } catch {
    return { ok: false, branding: DEFAULT_BRANDING };
  }
}
