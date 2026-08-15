import Link from "next/link";
import { GraduationCap, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-canvas">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-on-primary">
            <GraduationCap className="h-5 w-5" />
          </span>
          <span className="font-heading text-lg font-semibold text-ink">SEH Hub</span>
        </div>

        <Link href="/login" className="btn-secondary">
          Sign in
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 py-20">
        <p className="text-sm font-semibold uppercase tracking-wider text-ink-muted">
          School–Home Engagement
        </p>

        <h1 className="mt-4 max-w-2xl font-heading text-[44px] font-semibold leading-[1.12] text-ink sm:text-[56px]">
          Keep every parent in the loop.
        </h1>

        <div className="rule-accent mt-6" />

        <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
          Announcements, class updates and private messages between school and home —
          with every official notice cryptographically signed, so families can trust
          what they receive.
        </p>

        <div className="mt-10">
          <Link href="/login" className="btn-primary px-5 py-3 text-base">
            Sign in to your school
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>

      <footer className="mx-auto w-full max-w-5xl px-6 py-8">
        <p className="border-t border-line pt-6 text-sm text-ink-muted">
          A Kordex Technologies platform
        </p>
      </footer>
    </div>
  );
}
