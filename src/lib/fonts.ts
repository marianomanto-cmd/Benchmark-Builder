/**
 * Fonts — handoff §2.2 + gotcha §9.
 * Geist · JetBrains Mono · Newsreader. Self-hosted vía next/font/google (descarga en build, sin CDN runtime).
 * Si Geist no carga y se ve system-ui en el output, ABORTAR y arreglar imports antes de seguir (gotcha del handoff).
 */

import { Geist, JetBrains_Mono, Newsreader } from "next/font/google";

export const geist = Geist({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-geist",
  display: "swap",
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});

export const fontVariables = `${geist.variable} ${jetbrainsMono.variable} ${newsreader.variable}`;
