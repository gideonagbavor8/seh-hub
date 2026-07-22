"use client";

import { useState, useEffect, useRef } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

// ── Scramble Text Hook ────────────────────────────────────────────────────────
function useScrambleText(text: string, trigger: boolean, duration = 800) {
  const [display, setDisplay] = useState(text);
  const chars = "!@#$%^&*<>?/|ABCDEFabcdef0123456789";

  useEffect(() => {
    if (!trigger) return;
    let frame = 0;
    const totalFrames = Math.floor(duration / 16);
    const interval = setInterval(() => {
      if (frame >= totalFrames) {
        setDisplay(text);
        clearInterval(interval);
        return;
      }
      const progress = frame / totalFrames;
      const resolved = Math.floor(progress * text.length);
      setDisplay(
        text
          .split("")
          .map((char, i) => {
            if (char === " ") return " ";
            if (i < resolved) return char;
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join("")
      );
      frame++;
    }, 16);
    return () => clearInterval(interval);
  }, [trigger, text, duration]);

  return display;
}

// ── Aurora Background ─────────────────────────────────────────────────────────
function AuroraBackground() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      {/* Noise texture */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          opacity: 0.035,
        }}
      />
      {/* Aurora blob 1 */}
      <div
        style={{
          position: "absolute",
          top: "-20%",
          left: "-20%",
          width: "70%",
          height: "70%",
          borderRadius: "50%",
          background: "radial-gradient(circle, #00E32425 0%, transparent 70%)",
          animation: "aurora-drift-1 18s ease-in-out infinite alternate",
        }}
      />
      {/* Aurora blob 2 */}
      <div
        style={{
          position: "absolute",
          bottom: "-20%",
          right: "-10%",
          width: "60%",
          height: "60%",
          borderRadius: "50%",
          background: "radial-gradient(circle, #00B81E20 0%, transparent 70%)",
          animation: "aurora-drift-2 22s ease-in-out infinite alternate",
        }}
      />
      {/* Aurora blob 3 */}
      <div
        style={{
          position: "absolute",
          top: "40%",
          left: "30%",
          width: "40%",
          height: "40%",
          borderRadius: "50%",
          background: "radial-gradient(circle, #00E32410 0%, transparent 70%)",
          animation: "aurora-drift-1 28s ease-in-out infinite alternate-reverse",
        }}
      />
      {/* Scanline flicker */}
      <div
        className="absolute inset-0 pointer-events-none z-20"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.03) 3px, rgba(0,0,0,0.03) 4px)",
          animation: "scanline-flicker 12s steps(1) infinite",
        }}
      />
    </div>
  );
}

// ── Floating Label Input ──────────────────────────────────────────────────────
interface FloatingInputProps {
  id: string;
  name: string;
  type: string;
  label: string;
  required?: boolean;
  children?: React.ReactNode;
}

function FloatingInput({ id, name, type, label, required, children }: FloatingInputProps) {
  const [focused, setFocused] = useState(false);
  const [hasValue, setHasValue] = useState(false);

  return (
    <div className="relative group">
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        onFocus={() => setFocused(true)}
        onBlur={(e) => {
          setFocused(false);
          setHasValue(e.target.value.length > 0);
        }}
        onChange={(e) => setHasValue(e.target.value.length > 0)}
        style={{
          width: "100%",
          background: "#1A1A1A",
          border: `1px solid ${focused ? "#00E324" : "#2A2A2A"}`,
          borderRadius: "12px",
          padding: "20px 48px 8px 16px",
          color: "#ffffff",
          fontSize: "15px",
          outline: "none",
          transition: "border-color 0.2s ease, box-shadow 0.2s ease",
          boxShadow: focused ? "0 0 0 3px #00E32415, 0 0 20px #00E32408" : "none",
        }}
        placeholder=" "
      />
      <label
        htmlFor={id}
        style={{
          position: "absolute",
          left: "16px",
          top: focused || hasValue ? "8px" : "50%",
          transform: focused || hasValue ? "translateY(0)" : "translateY(-50%)",
          fontSize: focused || hasValue ? "11px" : "14px",
          fontWeight: focused || hasValue ? "600" : "400",
          color: focused ? "#00E324" : "#606060",
          letterSpacing: focused || hasValue ? "0.5px" : "0",
          textTransform: focused || hasValue ? "uppercase" : "none",
          transition: "all 0.2s cubic-bezier(0.76, 0, 0.24, 1)",
          pointerEvents: "none",
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

// ── Main Login Page ───────────────────────────────────────────────────────────
export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [formVisible, setFormVisible] = useState(false);

  const titleScramble = useScrambleText("SEH Hub", mounted);
  const welcomeScramble = useScrambleText("Welcome back", formVisible);

  useEffect(() => {
    setMounted(true);
    const t = setTimeout(() => setFormVisible(true), 300);
    return () => clearTimeout(t);
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const school_slug = formData.get("school_slug") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const res = await signIn("credentials", {
        school_slug,
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError(
          "Invalid credentials. Please check your School ID, email, and password."
        );
        setIsLoading(false);
      } else {
        router.refresh();
        router.push("/dashboard");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  }

  return (
    <>
      {/* Global keyframes */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800&family=Inter:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes aurora-drift-1 {
          0%   { transform: translate(0%, 0%) scale(1); }
          50%  { transform: translate(8%, 12%) scale(1.1); }
          100% { transform: translate(-6%, 8%) scale(0.95); }
        }
        @keyframes aurora-drift-2 {
          0%   { transform: translate(0%, 0%) scale(1); }
          50%  { transform: translate(-10%, -8%) scale(1.08); }
          100% { transform: translate(6%, -12%) scale(1.05); }
        }
        @keyframes scanline-flicker {
          0%, 94%, 100% { opacity: 1; }
          95%            { opacity: 0.7; }
          97%            { opacity: 1; }
          98%            { opacity: 0.8; }
        }
        @keyframes breathing-glow {
          0%, 100% { box-shadow: 0 0 12px #00E324, 0 0 24px #00E32460; }
          50%       { box-shadow: 0 0 6px #00E324, 0 0 12px #00E32430; }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes clip-reveal {
          from { clip-path: inset(0 100% 0 0); }
          to   { clip-path: inset(0 0% 0 0); }
        }
        @keyframes brand-float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-8px); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .seh-font-outfit { font-family: 'Outfit', sans-serif; }
        .seh-font-inter  { font-family: 'Inter', sans-serif; }

        .btn-sign-in:hover:not(:disabled) {
          background: #00B81E !important;
          box-shadow: 0 0 24px #00E32460, 0 4px 20px #00E32440 !important;
          transform: translateY(-1px);
        }
        .btn-sign-in:active:not(:disabled) {
          transform: translateY(0px);
        }
        .btn-sign-in:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0px 1000px #1A1A1A inset !important;
          -webkit-text-fill-color: #ffffff !important;
          caret-color: #ffffff;
        }
      `}</style>

      <div
        className="seh-font-inter"
        style={{
          display: "flex",
          minHeight: "100vh",
          background: "#0A0A0A",
        }}
      >
        {/* ── LEFT BRAND PANEL (desktop only) ── */}
        <div
          style={{
            display: "none",
            position: "relative",
            background: "#050505",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            overflow: "hidden",
            borderRight: "1px solid #00E32415",
          }}
          className="lg-brand-panel"
        >
          <AuroraBackground />

          {/* Brand content */}
          <div
            style={{
              position: "relative",
              zIndex: 10,
              textAlign: "center",
              padding: "0 48px",
              animation: mounted ? "brand-float 6s ease-in-out infinite" : "none",
            }}
          >
            {/* Logo mark */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 72,
                height: 72,
                borderRadius: 20,
                background: "linear-gradient(135deg, #00E324 0%, #00B81E 100%)",
                marginBottom: 24,
                animation: "breathing-glow 3s ease-in-out infinite",
              }}
            >
              <span
                className="seh-font-outfit"
                style={{ fontSize: 28, fontWeight: 800, color: "#000000" }}
              >
                S
              </span>
            </div>

            <h1
              className="seh-font-outfit"
              style={{
                fontSize: 52,
                fontWeight: 800,
                color: "#ffffff",
                letterSpacing: "-1px",
                lineHeight: 1,
                marginBottom: 12,
                animation: mounted ? "clip-reveal 0.8s cubic-bezier(0.76,0,0.24,1) both" : "none",
              }}
            >
              {titleScramble.split("Hub").map((part, i) =>
                i === 0 ? (
                  <span key={i}>{part}</span>
                ) : (
                  <span key={i}>
                    <span style={{ color: "#00E324" }}>Hub</span>
                    {part}
                  </span>
                )
              )}
            </h1>

            <p
              className="seh-font-inter"
              style={{
                fontSize: 16,
                color: "#606060",
                fontWeight: 400,
                letterSpacing: "0.3px",
                animation: mounted
                  ? "slide-up 0.6s cubic-bezier(0.76,0,0.24,1) 0.4s both"
                  : "none",
              }}
            >
              Connecting Schools and Homes
            </p>

            {/* Decorative green line */}
            <div
              style={{
                width: 48,
                height: 2,
                background: "#00E324",
                margin: "24px auto 0",
                borderRadius: 2,
                animation: "breathing-glow 3s ease-in-out infinite",
              }}
            />
          </div>

          {/* Bottom left watermark */}
          <div
            style={{
              position: "absolute",
              bottom: 24,
              left: 24,
              fontSize: 11,
              color: "#2A2A2A",
              fontFamily: "Inter, sans-serif",
              letterSpacing: "0.5px",
            }}
          >
            Powered by Kordex Technologies
          </div>
        </div>

        {/* ── RIGHT FORM PANEL ── */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            padding: "48px 24px",
            background: "#0A0A0A",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Mobile aurora (behind form) */}
          <div className="mobile-aurora">
            <AuroraBackground />
          </div>

          <div
            style={{
              width: "100%",
              maxWidth: 400,
              position: "relative",
              zIndex: 10,
            }}
          >
            {/* Mobile brand (hidden on desktop) */}
            <div
              className="mobile-brand"
              style={{
                textAlign: "center",
                marginBottom: 40,
                animation: mounted ? "slide-up 0.6s cubic-bezier(0.76,0,0.24,1) both" : "none",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  background: "linear-gradient(135deg, #00E324 0%, #00B81E 100%)",
                  marginBottom: 16,
                  animation: "breathing-glow 3s ease-in-out infinite",
                }}
              >
                <span
                  className="seh-font-outfit"
                  style={{ fontSize: 22, fontWeight: 800, color: "#000000" }}
                >
                  S
                </span>
              </div>
              <h1
                className="seh-font-outfit"
                style={{
                  fontSize: 32,
                  fontWeight: 800,
                  color: "#ffffff",
                  letterSpacing: "-0.5px",
                  marginBottom: 6,
                }}
              >
                SEH <span style={{ color: "#00E324" }}>Hub</span>
              </h1>
              <p style={{ fontSize: 13, color: "#606060" }}>
                Connecting Schools and Homes
              </p>
            </div>

            {/* Welcome heading */}
            <div
              style={{
                marginBottom: 32,
                animation: formVisible
                  ? "slide-up 0.5s cubic-bezier(0.76,0,0.24,1) 0.1s both"
                  : "none",
              }}
            >
              <h2
                className="seh-font-outfit"
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: "#ffffff",
                  letterSpacing: "-0.3px",
                  marginBottom: 6,
                }}
              >
                {welcomeScramble}
              </h2>
              <p style={{ fontSize: 13, color: "#505050", fontFamily: "Inter, sans-serif" }}>
                Sign in to your school account
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div
                style={{
                  marginBottom: 20,
                  padding: "12px 16px",
                  borderRadius: 10,
                  background: "#FF444415",
                  border: "1px solid #FF444440",
                  color: "#FF6666",
                  fontSize: 13,
                  fontFamily: "Inter, sans-serif",
                  animation: "slide-up 0.3s ease both",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                }}
              >
                <span style={{ fontSize: 15, flexShrink: 0 }}>⚠</span>
                {error}
              </div>
            )}

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              style={{ display: "flex", flexDirection: "column", gap: 14 }}
            >
              {/* School ID */}
              <div
                style={{
                  animation: formVisible
                    ? "slide-up 0.5s cubic-bezier(0.76,0,0.24,1) 0.15s both"
                    : "none",
                }}
              >
                <FloatingInput
                  id="school_slug"
                  name="school_slug"
                  type="text"
                  label="School ID"
                  required
                />
              </div>

              {/* Email */}
              <div
                style={{
                  animation: formVisible
                    ? "slide-up 0.5s cubic-bezier(0.76,0,0.24,1) 0.22s both"
                    : "none",
                }}
              >
                <FloatingInput
                  id="email"
                  name="email"
                  type="email"
                  label="Email Address"
                  required
                />
              </div>

              {/* Password */}
              <div
                style={{
                  animation: formVisible
                    ? "slide-up 0.5s cubic-bezier(0.76,0,0.24,1) 0.29s both"
                    : "none",
                }}
              >
                <FloatingInput
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  label="Password"
                  required
                >
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute",
                      right: 14,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#505050",
                      display: "flex",
                      alignItems: "center",
                      padding: 4,
                      transition: "color 0.15s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "#00E324")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "#505050")
                    }
                  >
                    {showPassword ? (
                      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0l-3.29-3.29" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </FloatingInput>
              </div>

              {/* Submit */}
              <div
                style={{
                  marginTop: 8,
                  animation: formVisible
                    ? "slide-up 0.5s cubic-bezier(0.76,0,0.24,1) 0.36s both"
                    : "none",
                }}
              >
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-sign-in seh-font-outfit"
                  style={{
                    width: "100%",
                    padding: "15px 24px",
                    borderRadius: 12,
                    border: "none",
                    background: "#00E324",
                    color: "#000000",
                    fontSize: 15,
                    fontWeight: 700,
                    letterSpacing: "0.3px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    transition: "all 0.2s cubic-bezier(0.76,0,0.24,1)",
                    boxShadow: "0 0 20px #00E32430",
                  }}
                >
                  {isLoading ? (
                    <>
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        style={{ animation: "spin 0.8s linear infinite" }}
                      >
                        <circle cx="12" cy="12" r="10" stroke="#00000040" strokeWidth="3" />
                        <path d="M12 2a10 10 0 0110 10" stroke="#000000" strokeWidth="3" strokeLinecap="round" />
                      </svg>
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </button>
              </div>
            </form>

            {/* Footer */}
            <p
              style={{
                marginTop: 32,
                textAlign: "center",
                fontSize: 12,
                color: "#303030",
                fontFamily: "Inter, sans-serif",
                animation: formVisible
                  ? "fade-in 0.6s ease 0.6s both"
                  : "none",
              }}
            >
              Account access is managed by your school administrator
            </p>
          </div>
        </div>
      </div>

      {/* Responsive styles */}
      <style>{`
        @media (min-width: 1024px) {
          .lg-brand-panel {
            display: flex !important;
            width: 50%;
            flex-shrink: 0;
          }
          .mobile-brand {
            display: none !important;
          }
          .mobile-aurora {
            display: none !important;
          }
        }
        @media (max-width: 1023px) {
          .lg-brand-panel {
            display: none !important;
          }
          .mobile-brand {
            display: block !important;
          }
          .mobile-aurora {
            display: block !important;
            position: absolute;
            inset: 0;
            pointer-events: none;
          }
        }
      `}</style>
    </>
  );
}