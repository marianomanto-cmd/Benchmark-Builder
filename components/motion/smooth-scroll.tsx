"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";

// Smooth scroll (Lenis) ONLY on the marketing home ("/"), which scrolls the
// window. App/dashboard routes render inside ScreenShell with an inner
// overflow:auto container; a global wheel hijack there swallows the wheel and
// breaks scrolling. So we scope Lenis to the home and let every other route use
// native scrolling. Also disabled under prefers-reduced-motion.
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const enabled = pathname === "/";

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, [enabled]);

  return <>{children}</>;
}
