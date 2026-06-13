import type { Metadata } from "next";
import { Geist, JetBrains_Mono, Newsreader } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SmoothScroll } from "@/components/motion/smooth-scroll";

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
  metadataBase: new URL("https://benchmark-builder.vercel.app"),
  title: {
    default: "Benchmark Builder — De mil señales, una sola lectura.",
    template: "%s · Benchmark Builder",
  },
  description:
    "Toda la conversación de tu categoría —redes, prensa y anuncios— analizada con IA y convertida en un reporte que se vende.",
  openGraph: {
    title: "Benchmark Builder — De mil señales, una sola lectura.",
    description:
      "Inteligencia competitiva y social listening asistido por IA. El reporte que se vende, en un clic.",
    type: "website",
    locale: "es_AR",
    images: [{ url: "/og.svg", width: 1200, height: 630, alt: "Benchmark Builder" }],
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${geist.variable} ${jbMono.variable} ${newsreader.variable}`}
    >
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          <SmoothScroll>{children}</SmoothScroll>
        </ThemeProvider>
      </body>
    </html>
  );
}
