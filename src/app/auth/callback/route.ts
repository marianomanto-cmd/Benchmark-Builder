/**
 * OAuth callback — intercambia el code de Google por sesión.
 * Si el email no está en la allowlist, signOut + redirect con error.
 */

import { NextResponse } from "next/server";
import { createClient, isAllowed } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/overview";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=invalid`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=invalid`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAllowed(user?.email)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=unauthorized`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
