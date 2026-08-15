"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  ShieldCheck,
  MessageSquare,
  Megaphone,
} from "lucide-react";

const HIGHLIGHTS = [
  {
    icon: Megaphone,
    title: "School announcements",
    body: "Every notice from the school office, in one place.",
  },
  {
    icon: ShieldCheck,
    title: "Verified notices",
    body: "Each notice is signed, so you know it is genuinely from the school.",
  },
  {
    icon: MessageSquare,
    title: "Talk to teachers",
    body: "Private messages between parents and teachers.",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

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
        setError("We could not sign you in. Check your school ID, email and password.");
        setIsLoading(false);
      } else {
        router.refresh();
        router.push("/dashboard");
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-1 bg-canvas">
      {/* ── Brand panel (desktop) ── */}
      <aside className="relative hidden w-[46%] max-w-2xl flex-col justify-between border-r border-line bg-primary-soft p-12 lg:flex">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-on-primary">
            <GraduationCap className="h-6 w-6" />
          </span>
          <span className="font-heading text-xl font-semibold text-ink">SEH Hub</span>
        </div>

        <div className="max-w-md">
          <h1 className="font-heading text-[42px] font-semibold leading-[1.15] text-ink">
            Where school and home stay in step.
          </h1>
          <div className="rule-accent mt-5" />

          <ul className="mt-10 space-y-6">
            {HIGHLIGHTS.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-4">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-surface text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block font-semibold text-ink">{title}</span>
                  <span className="mt-0.5 block text-sm leading-relaxed text-ink-soft">
                    {body}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-sm text-ink-muted">
          A Kordex Technologies platform
        </p>
      </aside>

      {/* ── Form ── */}
      <main className="flex flex-1 items-center justify-center px-5 py-12 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-sm"
        >
          {/* Mobile brand */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-on-primary">
              <GraduationCap className="h-6 w-6" />
            </span>
            <span className="font-heading text-xl font-semibold text-ink">SEH Hub</span>
          </div>

          <h2 className="font-heading text-3xl font-semibold text-ink">Welcome back</h2>
          <p className="mt-2 text-sm text-ink-muted">
            Sign in to see your school&rsquo;s updates.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label htmlFor="school_slug" className="field-label">
                School ID
              </label>
              <input
                id="school_slug"
                name="school_slug"
                type="text"
                required
                autoComplete="organization"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="e.g. his"
                className="input"
              />
              <p className="field-hint">The short code your school gave you.</p>
            </div>

            <div>
              <label htmlFor="email" className="field-label">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="you@school.edu.gh"
                className="input"
              />
            </div>

            <div>
              <label htmlFor="password" className="field-label">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="input pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-ink-muted transition-colors hover:text-ink"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-xl bg-danger-soft px-3.5 py-3 text-sm text-danger"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLoading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-8 text-sm text-ink-muted">
            Trouble signing in? Contact your school office.
          </p>
        </motion.div>
      </main>
    </div>
  );
}
