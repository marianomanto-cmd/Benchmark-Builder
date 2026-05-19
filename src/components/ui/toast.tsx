/**
 * <Toast> — handoff §3.1.
 * Border-left 3px del color del estado · ícono + título + body · action inline.
 * Entrada translateY(20)→0 + opacity 240ms ease.out.
 * Salida translateY(-10) + fade 180ms ease.in.
 * success/info auto-dismiss 5s · danger/warn manuales.
 * Stack abajo-derecha con gap 8px.
 */

"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { nanoid } from "nanoid";
import { cn } from "@/lib/cn";
import { transitions } from "@/lib/motion";

type Kind = "success" | "danger" | "warn" | "info";

export interface ToastInput {
  kind: Kind;
  title: string;
  body?: string;
  action?: { label: string; onClick: () => void };
  duration?: number;
}

interface Toast extends ToastInput {
  id: string;
}

interface ToastContextValue {
  push: (toast: ToastInput) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

const kindBorder: Record<Kind, string> = {
  success: "border-l-success",
  danger: "border-l-danger",
  warn: "border-l-warn",
  info: "border-l-info",
};

const kindIcon: Record<Kind, ReactNode> = {
  success: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.15" />
      <path d="m8 12 3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  danger: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.15" />
      <path d="M12 7v6m0 4h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  warn: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M12 3 2 21h20L12 3Z" fill="currentColor" opacity="0.15" />
      <path d="M12 9v5m0 3h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  info: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.15" />
      <path d="M12 11v6m0-10h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
};

const kindText: Record<Kind, string> = {
  success: "text-success",
  danger: "text-danger",
  warn: "text-warn",
  info: "text-info",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (input: ToastInput) => {
      const id = nanoid(8);
      setToasts((prev) => [...prev, { ...input, id }]);
      const autoDismiss = input.duration ?? (input.kind === "success" || input.kind === "info" ? 5000 : 0);
      if (autoDismiss > 0) {
        setTimeout(() => dismiss(id), autoDismiss);
      }
      return id;
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ push, dismiss }}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
        aria-live="polite"
        aria-atomic="false"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={transitions.toastIn}
              className={cn(
                "pointer-events-auto min-w-[280px] max-w-[380px] rounded-md bg-white shadow-3",
                "border border-n-200 border-l-[3px] p-3 flex gap-3",
                kindBorder[t.kind],
              )}
              role={t.kind === "danger" || t.kind === "warn" ? "alert" : "status"}
            >
              <span className={cn("shrink-0 mt-px", kindText[t.kind])}>{kindIcon[t.kind]}</span>
              <div className="flex-1 min-w-0">
                <div className="t-h3 text-n-900 leading-tight mb-0.5">{t.title}</div>
                {t.body && <div className="t-small text-n-600">{t.body}</div>}
                {t.action && (
                  <button
                    type="button"
                    onClick={() => {
                      t.action!.onClick();
                      dismiss(t.id);
                    }}
                    className={cn("mt-1.5 text-[12px] font-medium underline", kindText[t.kind])}
                  >
                    {t.action.label}
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="shrink-0 text-n-400 hover:text-n-700 transition-colors"
                aria-label="Cerrar"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="m6 6 12 12M6 18 18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
