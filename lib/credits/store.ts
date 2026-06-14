import { useEffect, useState } from "react";

// Credit balance for the (fake) user account. No backend yet → localStorage.
// TODO: reemplazar por el saldo real del backend cuando exista billing.
const KEY = "phatia_credits";
const EVENT = "phatia:credits-changed";

export function loadCredits(): number {
  if (typeof window === "undefined") return 0;
  try {
    const v = localStorage.getItem(KEY);
    return v ? Number(v) || 0 : 0;
  } catch {
    return 0;
  }
}

function persist(n: number) {
  try {
    localStorage.setItem(KEY, String(n));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* ignore */
  }
}

export function useCredits() {
  const [balance, setBalance] = useState(0); // SSR-stable; real value loaded on mount

  useEffect(() => {
    const sync = () => setBalance(loadCredits());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return {
    balance,
    // Set the balance to a fixed amount (used when subscribing to a plan).
    setCredits: (n: number) => { setBalance(n); persist(n); },
    addCredits: (n: number) => { const next = loadCredits() + n; setBalance(next); persist(next); },
    // Spend n credits; returns false (and no-op) if there isn't enough balance.
    spend: (n: number) => {
      const cur = loadCredits();
      if (cur < n) return false;
      const next = cur - n;
      setBalance(next);
      persist(next);
      return true;
    },
  };
}
