"use client";

import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";

interface ClipRevealProps {
  children: React.ReactNode;
  /** Direction of the reveal clip */
  from?: "left" | "right" | "top" | "bottom";
  delay?: number;
  duration?: number;
  className?: string;
}

const clipMap = {
  left: {
    initial: "inset(0 100% 0 0)",
    animate: "inset(0 0% 0 0)",
  },
  right: {
    initial: "inset(0 0 0 100%)",
    animate: "inset(0 0 0 0%)",
  },
  top: {
    initial: "inset(100% 0 0 0)",
    animate: "inset(0% 0 0 0)",
  },
  bottom: {
    initial: "inset(0 0 100% 0)",
    animate: "inset(0 0 0% 0)",
  },
};

/**
 * ClipReveal — wipes an element into view using clip-path animation.
 * Great for cards, images, and UI panels.
 */
export function ClipReveal({
  children,
  from = "left",
  delay = 0,
  duration = 0.7,
  className,
}: ClipRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-30px" });
  const { initial, animate } = clipMap[from];

  return (
    <motion.div
      ref={ref}
      initial={{ clipPath: initial }}
      animate={isInView ? { clipPath: animate } : { clipPath: initial }}
      transition={{
        duration,
        delay,
        ease: [0.76, 0, 0.24, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
