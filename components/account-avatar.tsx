"use client";

import { useState } from "react";
import { BRAND_DOMAINS } from "@/lib/accounts";

// Account avatar: shows the brand's logo (by slug → domain) on a light tile, with
// a robust source chain — Clearbit logo, then Google's favicon service — falling
// back to the accent-tinted initial (user-created accounts, or if all fail).
function sourcesFor(slug: string): string[] {
  const domain = BRAND_DOMAINS[slug];
  if (!domain) return [];
  return [
    `https://logo.clearbit.com/${domain}`,
    `https://www.google.com/s2/favicons?sz=128&domain=${domain}`,
  ];
}

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
  const sources = sourcesFor(slug);
  const [idx, setIdx] = useState(0);
  const src = sources[idx];
  const showLogo = Boolean(src);
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
          key={src}
          src={src}
          alt={name}
          width={size}
          height={size}
          loading="lazy"
          onError={() => setIdx((i) => i + 1)}
          style={{ width: "100%", height: "100%", objectFit: "contain", padding: Math.round(size * 0.16) }}
        />
      ) : (
        letter
      )}
    </span>
  );
}
