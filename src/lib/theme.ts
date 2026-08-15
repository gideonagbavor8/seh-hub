// src/lib/theme.ts
// Client-side theme + school-accent handling.
//
// Light is the default. Dark is opt-in via the header toggle, which writes
// data-theme on <html> and persists the choice. Deliberately not tied to
// prefers-color-scheme — see the note at the top of globals.css.

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "seh-theme";
/** Fired on <window> whenever the theme changes, so other code can re-derive. */
export const THEME_EVENT = "seh:themechange";

/** Surface colour each theme paints behind accented text — kept in sync with globals.css. */
const SURFACE: Record<Theme, [number, number, number]> = {
  light: [255, 255, 255],
  dark: [28, 27, 22],
};

// ---------------------------------------------------------------------------
// Colour maths
// ---------------------------------------------------------------------------

type RGB = [number, number, number];

function hexToRgb(hex: string): RGB | null {
  let value = hex.trim().replace(/^#/, "");

  if (value.length === 3) {
    value = value
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return null;

  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

function rgbToHex([r, g, b]: RGB): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${[r, g, b].map((n) => clamp(n).toString(16).padStart(2, "0")).join("")}`;
}

/** WCAG relative luminance. */
function luminance([r, g, b]: RGB): number {
  const channel = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a: RGB, b: RGB): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function mix(a: RGB, b: RGB, amount: number): RGB {
  return [
    a[0] + (b[0] - a[0]) * amount,
    a[1] + (b[1] - a[1]) * amount,
    a[2] + (b[2] - a[2]) * amount,
  ];
}

/**
 * Nudges a colour toward black (light theme) or white (dark theme) until it
 * clears `target` contrast against the surface it will sit on.
 *
 * Without this an admin could pick, say, a pale yellow and render every piece
 * of accented text in the app unreadable. The picker still shows their exact
 * choice; only the derived UI colour is corrected.
 */
function ensureContrast(colour: RGB, theme: Theme, target = 4.5): RGB {
  const surface = SURFACE[theme];
  const towards: RGB = theme === "dark" ? [255, 255, 255] : [0, 0, 0];

  if (contrast(colour, surface) >= target) return colour;

  let lo = 0;
  let hi = 1;
  let best = mix(colour, towards, 1);

  // Binary search the smallest shift that satisfies the target.
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2;
    const candidate = mix(colour, towards, mid);
    if (contrast(candidate, surface) >= target) {
      best = candidate;
      hi = mid;
    } else {
      lo = mid;
    }
  }

  return best;
}

/** Black or white, whichever is readable on top of `colour`. */
function readableOn(colour: RGB): string {
  return contrast(colour, [255, 255, 255]) >= contrast(colour, [16, 35, 26])
    ? "#ffffff"
    : "#10231a";
}

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

export function getStoredTheme(): Theme | null {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "dark" || stored === "light" ? stored : null;
  } catch {
    return null;
  }
}

export function getCurrentTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.getAttribute("data-theme") === "dark"
    ? "dark"
    : "light";
}

export function setTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Private browsing / storage disabled — the theme still applies for this session.
  }
  window.dispatchEvent(new CustomEvent<Theme>(THEME_EVENT, { detail: theme }));
}

/**
 * Inlined into <head> before first paint so a stored dark preference does not
 * flash light. Kept as a string because it must run before React hydrates.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t)}}catch(e){}})();`;

// ---------------------------------------------------------------------------
// School accent
// ---------------------------------------------------------------------------

/**
 * Applies a school's saved accent colour by overriding --primary on <html>.
 * --primary-hover, --primary-soft and --primary-ring are derived from it in
 * CSS via color-mix, so this single override recolours the whole system.
 *
 * Pass null to fall back to the built-in forest green.
 */
export function applySchoolAccent(hex: string | null | undefined, theme: Theme) {
  const root = document.documentElement;

  if (!hex) {
    root.style.removeProperty("--primary");
    root.style.removeProperty("--on-primary");
    return;
  }

  const rgb = hexToRgb(hex);
  if (!rgb) {
    root.style.removeProperty("--primary");
    root.style.removeProperty("--on-primary");
    return;
  }

  const safe = ensureContrast(rgb, theme);
  root.style.setProperty("--primary", rgbToHex(safe));
  root.style.setProperty("--on-primary", readableOn(safe));
}
