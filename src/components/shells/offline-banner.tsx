/**
 * Banner de offline — handoff §5 "Network offline": banner sticky abajo (no toast),
 * con reintento. En mobile se ubica sobre la bottom tab bar.
 */

"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return (
    <AnimatePresence>
      {offline && (
        <motion.div
          role="status"
          className="fixed inset-x-0 z-50 bottom-[78px] md:bottom-0 flex justify-center px-4"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.2, ease: [0.2, 0.7, 0.3, 1] }}
        >
          <div className="mb-3 flex items-center gap-2.5 bg-n-900 text-white rounded-md px-4 py-2.5 shadow-3">
            <span className="size-2 rounded-full bg-warn animate-pulse" />
            <span className="text-[13px] font-medium">Sin conexión</span>
            <span className="t-mono text-[11px] text-white/60">reintentando…</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
