"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_LOCALE, isLocale, makeT, type Locale, type TFn } from "@/lib/i18n";

type I18nValue = { locale: Locale; setLocale: (l: Locale) => void; t: TFn };

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ initialLocale = DEFAULT_LOCALE, children }: { initialLocale?: Locale; children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  // Reconcile with localStorage on mount (covers visits without the cookie set).
  useEffect(() => {
    try {
      const stored = localStorage.getItem("phema_locale");
      if (isLocale(stored) && stored !== locale) {
        setLocaleState(stored);
        document.cookie = `phema_locale=${stored};path=/;max-age=31536000;samesite=lax`;
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setLocale(l: Locale) {
    setLocaleState(l);
    try {
      localStorage.setItem("phema_locale", l);
      document.cookie = `phema_locale=${l};path=/;max-age=31536000;samesite=lax`;
    } catch {
      /* ignore */
    }
    if (typeof document !== "undefined") document.documentElement.lang = l;
  }

  const t = useMemo(() => makeT(locale), [locale]);
  const value = useMemo<I18nValue>(() => ({ locale, setLocale, t }), [locale, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  // Safe fallback so components never crash if used outside the provider.
  if (!ctx) return { locale: DEFAULT_LOCALE, setLocale: () => {}, t: makeT(DEFAULT_LOCALE) };
  return ctx;
}
