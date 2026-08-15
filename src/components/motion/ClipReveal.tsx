"use client";

import React, { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

interface ClipRevealProps {
  children: React.ReactNode;
  /** Direction the element eases in from */
  from?: "left" | "right" | "top" | "bottom";
  delay?: number;
  duration?: number;
  className?: string;
}

/** Small directional offsets — a hint of movement, not a wipe. */
const offsetMap = {
  left: { x: -12, y: 0 },
  right: { x: 12, y: 0 },
  top: { x: 0, y: -12 },
  bottom: { x: 0, y: 12 },
};

/**
 * ClipReveal — eases an element into view on scroll.
 *
 * Previously a clip-path wipe. Now a short fade-and-drift: clipping cropped
 * descenders and box shadows, and the long wipe read as decorative on a
 * content-dense dashboard. The prop shape is unchanged so call sites still work.
 */
export function ClipReveal({
  children,
  from = "left",
  delay = 0,
  duration = 0.35,
  className,
}: ClipRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });
  const reduceMotion = useReducedMotion();
  const offset = offsetMap[from];

  const hidden = reduceMotion ? { opacity: 0 } : { opacity: 0, ...offset };
  const shown = { opacity: 1, x: 0, y: 0 };

  return (
    <motion.div
      ref={ref}
      initial={hidden}
      animate={isInView ? shown : hidden}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
