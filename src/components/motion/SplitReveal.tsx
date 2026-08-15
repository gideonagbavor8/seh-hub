"use client";

import React, { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

interface SplitRevealProps {
  children: React.ReactNode;
  /** Retained for API compatibility; only meaningful on SplitRevealGroup. */
  stagger?: number;
  /** Entry delay */
  delay?: number;
  className?: string;
  direction?: "up" | "down";
}

/**
 * SplitReveal — lifts a heading into view.
 *
 * Note: no overflow-hidden mask. The old masked slide cropped the descenders
 * on the serif display face, so this eases position and opacity instead.
 */
export function SplitReveal({
  children,
  delay = 0,
  className,
  direction = "up",
}: SplitRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });
  const reduceMotion = useReducedMotion();

  const yOffset = reduceMotion ? 0 : direction === "up" ? 12 : -12;
  const hidden = { y: yOffset, opacity: 0 };
  const shown = { y: 0, opacity: 1 };

  return (
    <div ref={ref} className={className}>
      <motion.div
        initial={hidden}
        animate={isInView ? shown : hidden}
        transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
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
 * SplitRevealGroup — renders items with a light stagger.
 */
export function SplitRevealGroup({
  items,
  stagger = 0.06,
  delay = 0,
  className,
  itemClassName,
  direction = "up",
}: SplitRevealGroupProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });
  const reduceMotion = useReducedMotion();

  const yOffset = reduceMotion ? 0 : direction === "up" ? 12 : -12;
  const hidden = { y: yOffset, opacity: 0 };
  const shown = { y: 0, opacity: 1 };

  return (
    <div ref={ref} className={className}>
      {items.map((item, i) => (
        <div key={i} className={itemClassName}>
          <motion.div
            initial={hidden}
            animate={isInView ? shown : hidden}
            transition={{
              duration: 0.4,
              delay: delay + i * stagger,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            {item}
          </motion.div>
        </div>
      ))}
    </div>
  );
}
