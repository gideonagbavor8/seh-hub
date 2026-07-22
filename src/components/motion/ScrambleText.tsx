"use client";

import React, { useEffect, useRef, useState } from "react";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&";

interface ScrambleTextProps {
  text: string;
  /** Delay before scramble starts, ms */
  delay?: number;
  /** Duration of scramble effect, ms */
  duration?: number;
  className?: string;
  /** Wrapper element, defaults to span */
  as?: "span" | "p" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "div" | "label";
  /** Play animation when visible (uses IntersectionObserver) */
  triggerOnView?: boolean;
}

/**
 * ScrambleText — randomizes characters then resolves to final string.
 * Used for headings and hero labels for a hacker/premium feel.
 */
export function ScrambleText({
  text,
  delay = 0,
  duration = 1200,
  className,
  as: Tag = "span",
  triggerOnView = true,
}: ScrambleTextProps) {
  const [displayed, setDisplayed] = useState(triggerOnView ? text : "");
  const [active, setActive] = useState(!triggerOnView);
  const ref = useRef<HTMLSpanElement>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!triggerOnView) {
      setActive(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [triggerOnView]);

  useEffect(() => {
    if (!active) return;
    const timeout = setTimeout(() => {
      const startTime = performance.now();
      const chars = text.split("");

      function frame(now: number) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const resolvedCount = Math.floor(progress * chars.length);

        const result = chars.map((char, i) => {
          if (char === " ") return " ";
          if (i < resolvedCount) return char;
          return CHARS[Math.floor(Math.random() * CHARS.length)];
        });

        setDisplayed(result.join(""));

        if (progress < 1) {
          frameRef.current = requestAnimationFrame(frame);
        }
      }

      frameRef.current = requestAnimationFrame(frame);
    }, delay);

    return () => {
      clearTimeout(timeout);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [active, text, delay, duration]);

  // Use a span as sentinel for IntersectionObserver; Tag wraps the visual output.
  return (
    <>
      {/* Invisible sentinel for IntersectionObserver */}
      {triggerOnView && (
        <span ref={ref} aria-hidden="true" style={{ position: "absolute", pointerEvents: "none" }} />
      )}
      <Tag className={className} aria-label={text}>
        {displayed || text}
      </Tag>
    </>
  );
}
