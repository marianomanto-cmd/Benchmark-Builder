"use client";

import { useState } from "react";
import { BRAND_DOMAINS } from "@/lib/accounts";

// Account avatar: shows the brand's logo (by slug → domain, via Clearbit) on a
// light tile; falls back to the accent-tinted initial for user-created accounts
// or if the logo fails to load.
export function AccountAvatar({
  slug,
  name,
  letter,
  accent,
  size = 40,
  radius = 12,
}: {
  slug: string;
  name: string;
  letter: string;
  accent: string;
  size?: number;
  radius?: number;
}) {
  const domain = BRAND_DOMAINS[slug];
  const [failed, setFailed] = useState(false);
  const showLogo = Boolean(domain) && !failed;
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        flexShrink: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        background: showLogo ? "#fff" : `color-mix(in srgb, ${accent} 22%, transparent)`,
        color: accent,
        fontWeight: 700,
        fontSize: Math.round(size * 0.4),
      }}
    >
      {showLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://logo.clearbit.com/${domain}`}
          alt={name}
          width={size}
          height={size}
          loading="lazy"
          onError={() => setFailed(true)}
          style={{ width: "100%", height: "100%", objectFit: "contain", padding: Math.round(size * 0.16) }}
        />
      ) : (
        letter
      )}
    </span>
  );
}
