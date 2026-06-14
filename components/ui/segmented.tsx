"use client";

import { useEffect, useState, type CSSProperties } from "react";

// Segmented control (iOS-style) for switching between layouts of the same data.
export function Segmented({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { id: string; label: string }[] }) {
  return (
    <div role="tablist" style={wrap} className="bb-scroll-x">
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button key={o.id} type="button" role="tab" aria-selected={on} onClick={() => onChange(o.id)} style={seg(on)}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// View persistence: URL query param (keeps ?case=) + localStorage fallback.
// SSR-stable: starts at `def`, reconciles on mount to avoid hydration mismatch.
export function useToggleView(param: string, lsKey: string, options: readonly string[], def: string) {
  const [view, setView] = useState(def);
  useEffect(() => {
    try {
      const q = new URL(window.location.href).searchParams.get(param);
      const ls = localStorage.getItem(lsKey);
      const next = q && options.includes(q) ? q : ls && options.includes(ls) ? ls : def;
      if (next !== def) setView(next);
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function set(v: string) {
    setView(v);
    try {
      localStorage.setItem(lsKey, v);
      const url = new URL(window.location.href);
      url.searchParams.set(param, v);
      window.history.replaceState(null, "", url.toString());
    } catch {
      /* ignore */
    }
  }
  return [view, set] as const;
}

const wrap: CSSProperties = {
  display: "inline-flex",
  gap: 3,
  padding: 3,
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  borderRadius: "var(--r-md)",
  maxWidth: "100%",
};

function seg(on: boolean): CSSProperties {
  return {
    appearance: "none",
    border: "none",
    cursor: "pointer",
    padding: "6px 13px",
    borderRadius: "calc(var(--r-md) - 3px)",
    fontSize: 12,
    fontWeight: on ? 600 : 500,
    fontFamily: "var(--font-sans)",
    whiteSpace: "nowrap",
    background: on ? "var(--surface)" : "transparent",
    color: on ? "var(--text)" : "var(--text-muted)",
    boxShadow: on ? "var(--sh-1)" : "none",
    transition: "background 140ms ease, color 140ms ease",
  };
}
