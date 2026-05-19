"use client";

import { MotionConfig } from "motion/react";
import { ToastProvider } from "@/components/ui";

export function Providers({ children }: { children: React.ReactNode }) {
  // reducedMotion="user" → motion respeta prefers-reduced-motion del SO,
  // desactivando transform/layout y dejando sólo fades de opacity (handoff §6.4).
  return (
    <MotionConfig reducedMotion="user">
      <ToastProvider>{children}</ToastProvider>
    </MotionConfig>
  );
}
