"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

/**
 * CurtainTransition — neon green curtain wipes in/out on route change.
 * Wrap page content with this at the layout level or use it standalone.
 */
export function CurtainTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div key={pathname} className="relative w-full h-full">
        {/* Curtain slide-in from left */}
        <motion.div
          className="fixed inset-0 z-[9999] origin-left bg-[#00E324]"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 0 }}
          exit={{ scaleX: 0 }}
          style={{ transformOrigin: "left" }}
        />
        {/* Page content with curtain wipe reveal */}
        <motion.div
          initial={{ clipPath: "inset(0 100% 0 0)" }}
          animate={{ clipPath: "inset(0 0% 0 0)" }}
          exit={{ clipPath: "inset(0 0 0 100%)" }}
          transition={{ duration: 0.55, ease: [0.76, 0, 0.24, 1] }}
          className="w-full h-full"
        >
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
