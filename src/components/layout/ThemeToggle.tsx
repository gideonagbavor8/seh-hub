"use client";

import React, { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { getCurrentTheme, setTheme, THEME_EVENT, type Theme } from "@/lib/theme";

export default function ThemeToggle() {
  // Start light to match the server render; the real value is read after mount
  // so the markup cannot mismatch during hydration.
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setThemeState(getCurrentTheme());
    setMounted(true);

    const onChange = (e: Event) => {
      setThemeState((e as CustomEvent<Theme>).detail);
    };
    window.addEventListener(THEME_EVENT, onChange);
    return () => window.removeEventListener(THEME_EVENT, onChange);
  }, []);

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="rounded-xl p-2 text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Light mode" : "Dark mode"}
      id="theme-toggle"
    >
      {/* Before mount we cannot know the stored theme, so render the light-mode
          icon to keep server and client markup identical. */}
      {mounted && isDark ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </button>
  );
}
