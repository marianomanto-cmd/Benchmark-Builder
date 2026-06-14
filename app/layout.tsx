import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Inter, JetBrains_Mono, Newsreader } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SmoothScroll } from "@/components/motion/smooth-scroll";
import { SiteBackground } from "@/components/marketing/site-bg";
import { I18nProvider } from "@/components/i18n-provider";
import { SessionProvider } from "@/components/session-provider";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n";
import { SESSION_COOKIE } from "@/lib/session";

/* HANDOFF §2.2 — three families, one mission each.
 * Inter (UI · giga-aligned), JetBrains Mono (numerals/labels), Newsreader
 * (report + pull-quotes). The UI var keeps the name --font-geist for backward
 * compatibility with the token map in globals.css (--font-sans → --font-geist). */
const sans = Inter({
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
  icons: { icon: "/brand/logo.jpg" },
  title: {
    default: "Phatia — Inteligencia competitiva, en una sola lectura.",
    template: "%s · Phatia",
  },
  description:
    "Toda la conversación de tu categoría —redes, prensa y anuncios— convertida en un reporte que se vende.",
  openGraph: {
    title: "Phatia — Inteligencia competitiva, en una sola lectura.",
    description:
      "Inteligencia competitiva y social listening. El reporte que se vende, en un clic.",
    type: "website",
    locale: "es_AR",
    images: [{ url: "/og.svg", width: 1200, height: 630, alt: "Phatia" }],
  },
  twitter: { card: "summary_large_image" },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jar = await cookies();
  const cookieLocale = jar.get("phema_locale")?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
  const loggedIn = jar.get(SESSION_COOKIE)?.value === "1";
  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${sans.variable} ${jbMono.variable} ${newsreader.variable}`}
    >
      <body>
        <SiteBackground />
        <I18nProvider initialLocale={locale}>
          <SessionProvider initialLoggedIn={loggedIn}>
            <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
              <SmoothScroll>{children}</SmoothScroll>
            </ThemeProvider>
          </SessionProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
