/**
 * Motion tokens — handoff §6.
 * Estas son las ÚNICAS curvas y duraciones que se usan en la app.
 * Cualquier animación nueva debe importar de acá; nada de números mágicos.
 */

import type { Transition } from "motion/react";

/** Curvas — §6.1 */
export const ease = {
  out: [0.2, 0.7, 0.3, 1] as const,
  in: [0.7, 0, 0.84, 0] as const,
  inOut: [0.4, 0, 0.2, 1] as const,
  bounce: [0.34, 1.56, 0.64, 1] as const,
};

/** Duraciones (segundos) — §6.2 */
export const duration = {
  hover: 0.15,
  focus: 0.12,
  press: 0.08,
  modalIn: 0.24,
  modalOut: 0.18,
  toastIn: 0.24,
  toastOut: 0.18,
  page: 0.24,
  counter: 1.0,
  chartBars: 0.6,
  flip: 0.24,
  tooltip: 0.12,
};

/** Stagger entre items en listas (>3 items) — §6.4 */
export const stagger = {
  fast: 0.05,
  normal: 0.06,
  slow: 0.08,
};

/** Transitions preset listas para usar */
export const transitions = {
  hover: { duration: duration.hover, ease: ease.out } satisfies Transition,
  modalIn: { duration: duration.modalIn, ease: ease.out } satisfies Transition,
  modalOut: { duration: duration.modalOut, ease: ease.in } satisfies Transition,
  toastIn: { duration: duration.toastIn, ease: ease.out } satisfies Transition,
  toastOut: { duration: duration.toastOut, ease: ease.in } satisfies Transition,
  page: { duration: duration.page, ease: ease.inOut } satisfies Transition,
  flip: { duration: duration.flip, ease: ease.out } satisfies Transition,
};

/** Variants comunes — entrada con fade + translateY */
export const fadeUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

/** Variants modal — scale + fade */
export const modalContent = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.96 },
};

/** Stagger container — para listas */
export const staggerContainer = (delayChildren = 0, stagger_ = stagger.normal) => ({
  animate: {
    transition: {
      staggerChildren: stagger_,
      delayChildren,
    },
  },
});
