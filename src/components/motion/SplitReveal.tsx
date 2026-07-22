"use client";

import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";

interface SplitRevealProps {
  children: React.ReactNode;
  /** Stagger delay between lines */
  stagger?: number;
  /** Entry delay */
  delay?: number;
  className?: string;
  direction?: "up" | "down";
}

/**
 * SplitReveal — wraps children with a clipping mask and slides them into view.
 * Ideal for hero headings and section titles.
 */
export function SplitReveal({
  children,
  stagger = 0.08,
  delay = 0,
  className,
  direction = "up",
}: SplitRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  const yOffset = direction === "up" ? "110%" : "-110%";

  return (
    <div ref={ref} className={`overflow-hidden ${className ?? ""}`}>
      <motion.div
        initial={{ y: yOffset, opacity: 0 }}
        animate={isInView ? { y: 0, opacity: 1 } : { y: yOffset, opacity: 0 }}
        transition={{
          duration: 0.7,
          delay,
          ease: [0.33, 1, 0.68, 1],
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}

interface SplitRevealGroupProps {
  items: React.ReactNode[];
  stagger?: number;
  delay?: number;
  className?: string;
  itemClassName?: string;
  direction?: "up" | "down";
}

/**
 * SplitRevealGroup — renders a group of items, each with staggered SplitReveal.
 */
export function SplitRevealGroup({
  items,
  stagger = 0.08,
  delay = 0,
  className,
  itemClassName,
  direction = "up",
}: SplitRevealGroupProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const yOffset = direction === "up" ? "110%" : "-110%";

  return (
    <div ref={ref} className={className}>
      {items.map((item, i) => (
        <div key={i} className={`overflow-hidden ${itemClassName ?? ""}`}>
          <motion.div
            initial={{ y: yOffset, opacity: 0 }}
            animate={isInView ? { y: 0, opacity: 1 } : { y: yOffset, opacity: 0 }}
            transition={{
              duration: 0.7,
              delay: delay + i * stagger,
              ease: [0.33, 1, 0.68, 1],
            }}
          >
            {item}
          </motion.div>
        </div>
      ))}
    </div>
  );
}
