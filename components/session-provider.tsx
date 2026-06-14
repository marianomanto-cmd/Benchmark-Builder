"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { FAKE_USER, SESSION_COOKIE, type User } from "@/lib/session";

type SessionValue = { user: User | null; signIn: () => void; login: () => void; logout: () => void };

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ initialLoggedIn = false, children }: { initialLoggedIn?: boolean; children: ReactNode }) {
  const [user, setUser] = useState<User | null>(initialLoggedIn ? FAKE_USER : null);
  const router = useRouter();

  // Reconcile with localStorage on mount (e.g. cookie cleared but ls kept).
  useEffect(() => {
    try {
      const v = localStorage.getItem(SESSION_COOKIE);
      if (v === "1" && !user) {
        setUser(FAKE_USER);
        document.cookie = `${SESSION_COOKIE}=1;path=/;max-age=31536000;samesite=lax`;
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Set the session without navigating (used when finishing the first report).
  function signIn() {
    setUser(FAKE_USER);
    try {
      localStorage.setItem(SESSION_COOKIE, "1");
      document.cookie = `${SESSION_COOKIE}=1;path=/;max-age=31536000;samesite=lax`;
    } catch {
      /* ignore */
    }
  }

  function login() {
    signIn();
    router.push("/dashboard");
    router.refresh();
  }

  function logout() {
    setUser(null);
    try {
      localStorage.removeItem(SESSION_COOKIE);
      document.cookie = `${SESSION_COOKIE}=;path=/;max-age=0;samesite=lax`;
    } catch {
      /* ignore */
    }
    router.push("/");
    router.refresh();
  }

  return <SessionContext.Provider value={{ user, signIn, login, logout }}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  return useContext(SessionContext) ?? { user: null, signIn: () => {}, login: () => {}, logout: () => {} };
}
