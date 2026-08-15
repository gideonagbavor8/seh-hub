"use client";

import React, { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";

interface CountUpProps {
  to: number;
  from?: number;
  duration?: number;
  delay?: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}

function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

/**
 * CountUp — animates a number into place when it scrolls into view.
 * Renders with tabular numerals so the width does not jitter mid-count.
 */
export function CountUp({
  to,
  from = 0,
  duration = 1200,
  delay = 0,
  decimals = 0,
  suffix = "",
  prefix = "",
  className,
}: CountUpProps) {
  const reduceMotion = useReducedMotion();
  const [value, setValue] = useState(reduceMotion ? to : from);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });
  const hasStarted = useRef(false);

  useEffect(() => {
    if (!isInView || hasStarted.current) return;
    hasStarted.current = true;

    // Respect the OS setting — show the final value, skip the animation.
    if (reduceMotion) {
      setValue(to);
      return;
    }

    let frameId = 0;

    const timeout = setTimeout(() => {
      const startTime = performance.now();

      function frame(now: number) {
        const progress = Math.min((now - startTime) / duration, 1);
        setValue(from + (to - from) * easeOutExpo(progress));

        if (progress < 1) {
          frameId = requestAnimationFrame(frame);
        }
      }

      frameId = requestAnimationFrame(frame);
    }, delay);

    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(frameId);
    };
  }, [isInView, from, to, duration, delay, reduceMotion]);

  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {prefix}
      {value.toFixed(decimals)}
      {suffix}
    </span>
  );
}
