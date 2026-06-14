"use client";

import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { LOCALES, LOCALE_LABEL, isLocale } from "@/lib/i18n";

// Compact language picker for the headers (marketing nav + app shell).
export function LanguageSelect({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useI18n();
  const router = useRouter();
  return (
    <label
      title={t("common.language")}
      style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--text-muted)", cursor: "pointer" }}
    >
      <Globe size={15} aria-hidden />
      <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>{t("common.language")}</span>
      <select
        value={locale}
        onChange={(e) => {
          const v = e.target.value;
          if (isLocale(v)) {
            setLocale(v);
            router.refresh();
          }
        }}
        style={{
          appearance: "none",
          WebkitAppearance: "none",
          MozAppearance: "none",
          border: "1px solid var(--border)",
          background: "var(--surface-2)",
          color: "var(--text)",
          borderRadius: "var(--r-sm)",
          padding: "4px 8px",
          fontSize: 12,
          fontFamily: "var(--font-mono)",
          cursor: "pointer",
        }}
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>
            {compact ? l.toUpperCase() : LOCALE_LABEL[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
