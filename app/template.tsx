"use client";

import { motion } from "motion/react";

// Subtle fade between route changes (re-mounts per navigation).
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}>
      {children}
    </motion.div>
  );
}
