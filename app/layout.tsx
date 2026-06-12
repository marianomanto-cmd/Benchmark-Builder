import type { Metadata } from "next";
import { Geist, JetBrains_Mono, Newsreader } from "next/font/google";
import "./globals.css";

/* HANDOFF §2.2 — three families, one mission each.
 * Geist (UI), JetBrains Mono (numerals), Newsreader (report + pull-quotes). */
const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

const jbMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jbmono",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Benchmark Builder",
  description:
    "Research competitivo y social listening asistido por IA. Inteligencia de marca, presentable.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geist.variable} ${jbMono.variable} ${newsreader.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
