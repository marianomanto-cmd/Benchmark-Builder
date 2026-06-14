"use client";

import { useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/session-provider";
import { useI18n } from "@/components/i18n-provider";

// Avatar dropdown with the account + sign out. Shown wherever the user is logged
// in (app shell header and the marketing/home nav).
export function UserMenu() {
  const { user, logout } = useSession();
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  if (!user) return null;
  const item: CSSProperties = { display: "block", width: "100%", textAlign: "left", padding: "8px 10px", borderRadius: "var(--r-sm)", border: "none", background: "transparent", color: "var(--text)", fontSize: 13, cursor: "pointer" };
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-label={t("nav.account")} aria-expanded={open} style={{ width: 32, height: 32, borderRadius: "50%", overflow: "hidden", border: "1px solid var(--border-strong)", padding: 0, cursor: "pointer", background: "var(--surface-2)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={user.avatar} alt={user.name} width={32} height={32} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <div style={{ position: "absolute", right: 0, top: 42, zIndex: 50, width: 220, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", boxShadow: "var(--sh-3)", padding: 8 }}>
            <div style={{ padding: "6px 10px 10px", borderBottom: "1px solid var(--border)", marginBottom: 6 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{user.name}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)", overflow: "hidden", textOverflow: "ellipsis" }}>{user.email}</div>
            </div>
            <button type="button" style={item} onClick={() => { setOpen(false); router.push("/dashboard"); }}>{t("nav.dashboard")}</button>
            <button type="button" style={item} onClick={() => { setOpen(false); logout(); }}>{t("nav.signout")}</button>
          </div>
        </>
      )}
    </div>
  );
}
