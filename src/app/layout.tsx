import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { fontVariables } from "@/lib/fonts";
import { defaultLocale } from "@/i18n/config";
import { Providers } from "./providers";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Benchmark Builder",
  description: "Research competitivo y social listening asistido por IA.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const messages = await getMessages();
  return (
    <html lang={defaultLocale} className={fontVariables}>
      <body className="bg-paper text-n-900 font-sans antialiased">
        <NextIntlClientProvider messages={messages} locale={defaultLocale}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
