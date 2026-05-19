/**
 * <Modal> — handoff §3.1.
 * Backdrop blur(8px) + opacity 0.6 · content scale 0.96→1 + opacity 200ms ease.out.
 * Esc / backdrop click cierra · focus trap interno.
 * Variante destructiva: type-to-confirm con keyword obligatorio ("eliminar").
 */

"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Btn } from "./btn";
import { cn } from "@/lib/cn";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  /** Tamaño máximo del contenido. */
  size?: "sm" | "md" | "lg";
  /** Si está, click en backdrop no cierra (modal no-dismissible). */
  noBackdropDismiss?: boolean;
}

const sizeClasses = {
  sm: "max-w-[380px]",
  md: "max-w-[520px]",
  lg: "max-w-[720px]",
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  noBackdropDismiss,
}: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    // Focus trap básico — al primer focusable
    const t = setTimeout(() => {
      const f = ref.current?.querySelector<HTMLElement>(
        'button,input,select,textarea,[tabindex]:not([tabindex="-1"])',
      );
      f?.focus();
    }, 50);
    return () => {
      document.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center p-4"
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <motion.div
            className="absolute inset-0 bg-n-900/60 backdrop-blur-[8px]"
            variants={{
              initial: { opacity: 0 },
              animate: { opacity: 1 },
              exit: { opacity: 0 },
            }}
            transition={{ duration: 0.2, ease: [0.2, 0.7, 0.3, 1] }}
            onClick={noBackdropDismiss ? undefined : onClose}
          />
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal
            aria-labelledby="modal-title"
            className={cn(
              "relative w-full bg-white rounded-md shadow-4 border border-n-200",
              sizeClasses[size],
            )}
            variants={{
              initial: { opacity: 0, scale: 0.96 },
              animate: { opacity: 1, scale: 1 },
              exit: { opacity: 0, scale: 0.96 },
            }}
            transition={{ duration: 0.2, ease: [0.2, 0.7, 0.3, 1] }}
          >
            <div className="px-5 pt-5 pb-3">
              <h2 id="modal-title" className="t-h2">
                {title}
              </h2>
              {description && (
                <div className="t-body text-n-600 mt-1.5">{description}</div>
              )}
            </div>
            {children && <div className="px-5 py-3">{children}</div>}
            {footer && (
              <div className="px-5 pt-3 pb-5 flex gap-2 justify-end border-t border-n-100 mt-2">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Modal destructiva con type-to-confirm.
 * El campo desbloquea el botón sólo cuando el usuario tipea `confirmText` (case-insensitive).
 */
export interface ConfirmDestructiveProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: ReactNode;
  confirmText?: string;
  confirmLabel?: string;
}

export function ConfirmDestructive({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "eliminar",
  confirmLabel = "Eliminar",
}: ConfirmDestructiveProps) {
  const ref = useRef<HTMLInputElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!open) {
      setEnabled(false);
      if (ref.current) ref.current.value = "";
    }
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      noBackdropDismiss
      footer={
        <>
          <Btn kind="secondary" onClick={onClose}>
            Cancelar
          </Btn>
          <Btn
            kind="destructive"
            disabled={!enabled}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Btn>
        </>
      }
    >
      <label className="flex flex-col gap-1.5">
        <span className="t-micro">
          Tipeá <span className="t-mono text-danger">{confirmText}</span> para confirmar
        </span>
        <input
          ref={ref}
          type="text"
          autoComplete="off"
          className="h-9 px-3 rounded-sm border border-n-300 bg-white text-[14px] focus:border-danger focus:shadow-[0_0_0_3px_rgba(184,38,29,0.10)] outline-none transition"
          onChange={(e) => {
            setEnabled(e.target.value.toLowerCase().trim() === confirmText.toLowerCase());
          }}
        />
      </label>
    </Modal>
  );
}
