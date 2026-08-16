"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDashboard } from "@/context/DashboardContext";
import { SplitReveal } from "@/components/motion/SplitReveal";
import {
  BookOpen,
  Plus,
  Check,
  Clock,
  AlertTriangle,
  X,
  Loader2,
  CalendarDays,
} from "lucide-react";

interface Cohort {
  id: string;
  name: string;
}

interface ChildStatus {
  id: string;
  name: string;
  completed: boolean;
}

interface HomeworkItem {
  id: string;
  subject: string;
  title: string;
  instructions: string;
  due_date: string;
  cohort_id: string;
  cohort_name: string;
  teacher_name: string;
  completed_by_me: boolean | null;
  completed_count: number;
  roster_count: number;
  children: ChildStatus[] | null;
}

type Bucket = "due" | "overdue" | "done";

const DAY_MS = 86_400_000;

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** "Due tomorrow" reads better than a date for the things that matter most. */
function dueLabel(iso: string) {
  const due = new Date(iso);
  const days = Math.round((due.setHours(0, 0, 0, 0) - startOfToday()) / DAY_MS);

  if (days === 0) return { text: "Due today", tone: "warning" as const };
  if (days === 1) return { text: "Due tomorrow", tone: "warning" as const };
  if (days < 0) {
    const late = Math.abs(days);
    return { text: `${late} day${late === 1 ? "" : "s"} overdue`, tone: "danger" as const };
  }
  return {
    text: `Due ${new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}`,
    tone: "neutral" as const,
  };
}

function Skeleton() {
  return (
    <div className="card space-y-3 p-5">
      <div className="skeleton h-4 w-24" />
      <div className="skeleton h-5 w-2/3" />
      <div className="skeleton h-3 w-full" />
    </div>
  );
}

export default function HomeworkPage() {
  const { user, setPageTitle, refreshHomeworkCount } = useDashboard();
  const [items, setItems] = useState<HomeworkItem[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [tab, setTab] = useState<Bucket>("due");
  // Staff can see the whole school's homework, which is far too noisy for a
  // teacher. Default them to their own classes; "all" stays available.
  const [classFilter, setClassFilter] = useState<string>("mine");

  const isStaff = user.role === "teacher" || user.role === "admin";
  const isStudent = user.role === "student";

  useEffect(() => {
    setPageTitle("Homework");
  }, [setPageTitle]);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/homework");
      const json = await res.json();
      if (json.success) setItems(json.data);
      else setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!isStaff) return;
    fetch("/api/cohorts")
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setCohorts(j.data);
      })
      .catch(() => {});
  }, [isStaff]);

  async function toggleDone(item: HomeworkItem) {
    setBusyId(item.id);
    const done = item.completed_by_me === true;

    // Optimistic — ticking should feel instant.
    setItems((prev) =>
      prev.map((h) =>
        h.id === item.id
          ? {
              ...h,
              completed_by_me: !done,
              completed_count: h.completed_count + (done ? -1 : 1),
            }
          : h
      )
    );

    try {
      const res = await fetch(`/api/homework/${item.id}/complete`, {
        method: done ? "DELETE" : "POST",
      });
      if (!res.ok) throw new Error("failed");
      refreshHomeworkCount(); // keep the sidebar badge in step
    } catch {
      load(); // Put the truth back if the server disagreed.
    } finally {
      setBusyId(null);
    }
  }

  const buckets = useMemo(() => {
    const today = startOfToday();
    const due: HomeworkItem[] = [];
    const overdue: HomeworkItem[] = [];
    const done: HomeworkItem[] = [];

    // /api/cohorts returns exactly the classes this person may set work for,
    // so it doubles as the definition of "mine".
    const mine = new Set(cohorts.map((c) => c.id));
    const scoped = !isStaff
      ? items
      : classFilter === "all"
        ? items
        : classFilter === "mine"
          ? items.filter((h) => mine.has(h.cohort_id))
          : items.filter((h) => h.cohort_id === classFilter);

    for (const h of scoped) {
      if (isStudent && h.completed_by_me) {
        done.push(h);
        continue;
      }
      const d = new Date(h.due_date);
      d.setHours(0, 0, 0, 0);
      if (d.getTime() < today) overdue.push(h);
      else due.push(h);
    }

    due.sort((a, b) => +new Date(a.due_date) - +new Date(b.due_date));
    overdue.sort((a, b) => +new Date(b.due_date) - +new Date(a.due_date));
    return { due, overdue, done };
  }, [items, isStudent, isStaff, cohorts, classFilter]);

  const visible = buckets[tab];

  const TABS: { key: Bucket; label: string; count: number }[] = [
    { key: "due", label: "Upcoming", count: buckets.due.length },
    { key: "overdue", label: "Overdue", count: buckets.overdue.length },
    ...(isStudent ? [{ key: "done" as Bucket, label: "Done", count: buckets.done.length }] : []),
  ];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8">
      <SplitReveal>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-heading text-3xl font-semibold text-ink sm:text-[38px]">Homework</h2>
            <div className="rule-accent mt-3" />
            <p className="mt-3 text-sm text-ink-muted">
              {isStaff && "Work you have set, and how many of each class have finished it."}
              {isStudent && "Everything set for your class. Tick it off as you finish."}
              {user.role === "parent" && "What your children have been set, and whether it is done."}
            </p>
          </div>

          {isStaff && (
            <button onClick={() => setComposeOpen(true)} className="btn btn-primary">
              <Plus className="h-4 w-4" />
              Set homework
            </button>
          )}
        </div>
      </SplitReveal>

      {/* Tabs + class filter */}
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            aria-pressed={tab === t.key}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors ${
              tab === t.key
                ? "bg-primary text-on-primary"
                : "bg-surface-2 text-ink-soft hover:text-ink"
            }`}
          >
            {t.label}
            <span
              className={`rounded-full px-1.5 text-xs tabular ${
                tab === t.key ? "bg-black/15" : "bg-surface-3"
              }`}
            >
              {t.count}
            </span>
          </button>
        ))}

        {isStaff && cohorts.length > 0 && (
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            aria-label="Filter by class"
            className="input ml-auto h-9 w-auto py-0 text-sm"
          >
            <option value="mine">My classes</option>
            <option value="all">All classes</option>
            {cohorts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col gap-4">
          <Skeleton />
          <Skeleton />
        </div>
      ) : failed ? (
        <div className="card flex items-center gap-3 p-5 text-sm text-ink-soft">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 text-warning" />
          Homework could not be loaded right now.
        </div>
      ) : visible.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-2 px-8 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-2 text-ink-muted">
            <BookOpen className="h-5 w-5" />
          </span>
          <p className="mt-1 text-sm font-medium text-ink">
            {tab === "overdue"
              ? "Nothing overdue"
              : tab === "done"
                ? "Nothing ticked off yet"
                : "No homework set"}
          </p>
          <p className="max-w-sm text-sm text-ink-muted">
            {tab === "overdue"
              ? "Everything is up to date."
              : isStaff
                ? "Use “Set homework” to give a class their next assignment."
                : "New work will appear here as teachers set it."}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {visible.map((h, i) => {
            const due = dueLabel(h.due_date);
            const pct =
              h.roster_count > 0 ? Math.round((h.completed_count / h.roster_count) * 100) : 0;

            return (
              <motion.li
                key={h.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(i, 6) * 0.04 }}
                className="card p-5"
              >
                <div className="flex items-start gap-4">
                  {isStudent && (
                    <button
                      onClick={() => toggleDone(h)}
                      disabled={busyId === h.id}
                      aria-pressed={h.completed_by_me === true}
                      aria-label={h.completed_by_me ? "Mark as not done" : "Mark as done"}
                      className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg border transition-colors ${
                        h.completed_by_me
                          ? "border-primary bg-primary text-on-primary"
                          : "border-line-strong text-transparent hover:border-primary"
                      }`}
                    >
                      {busyId === h.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-ink-muted" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="badge-primary">{h.subject}</span>
                      <span className="badge-neutral">{h.cohort_name}</span>
                      <span
                        className={
                          due.tone === "danger"
                            ? "badge-danger"
                            : due.tone === "warning"
                              ? "badge-warning"
                              : "badge-neutral"
                        }
                      >
                        <Clock className="h-3 w-3" />
                        {due.text}
                      </span>
                    </div>

                    <h3
                      className={`mt-2 font-heading text-lg font-semibold ${
                        h.completed_by_me ? "text-ink-muted line-through" : "text-ink"
                      }`}
                    >
                      {h.title}
                    </h3>

                    <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink-soft">
                      {h.instructions}
                    </p>

                    <p className="mt-3 text-xs text-ink-muted">Set by {h.teacher_name}</p>

                    {/* Teacher: class progress */}
                    {isStaff && h.roster_count > 0 && (
                      <div className="mt-4">
                        <div className="mb-1.5 flex items-center justify-between text-xs">
                          <span className="font-medium text-ink-soft">
                            {h.completed_count} of {h.roster_count} finished
                          </span>
                          <span className="tabular text-ink-muted">{pct}%</span>
                        </div>
                        <div
                          className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3"
                          role="progressbar"
                          aria-valuenow={pct}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        >
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                            className="h-full rounded-full bg-primary"
                          />
                        </div>
                      </div>
                    )}

                    {/* Parent: per-child status */}
                    {h.children && h.children.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {h.children.map((c) => (
                          <span
                            key={c.id}
                            className={c.completed ? "badge-primary" : "badge-warning"}
                          >
                            {c.completed ? <Check className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                            {c.name.split(" ")[0]} — {c.completed ? "done" : "not yet"}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.li>
            );
          })}
        </ul>
      )}

      <AnimatePresence>
        {composeOpen && (
          <SetHomeworkPanel
            cohorts={cohorts}
            onClose={() => setComposeOpen(false)}
            onCreated={() => {
              setComposeOpen(false);
              setTab("due");
              load();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function SetHomeworkPanel({
  cohorts,
  onClose,
  onCreated,
}: {
  cohorts: Cohort[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [cohortId, setCohortId] = useState("");
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canSave = cohortId && subject.trim() && title.trim() && instructions.trim() && dueDate;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave || saving) return;

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/homework", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cohortId, subject, title, instructions, dueDate }),
      });
      const json = await res.json();
      if (json.success) onCreated();
      else setError(json.error || "Could not save.");
    } catch {
      setError("Could not save. Check your connection.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-ink/25 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-lg sm:inset-0 sm:my-auto sm:h-fit"
        role="dialog"
        aria-modal="true"
        aria-label="Set homework"
      >
        <form onSubmit={submit} className="card m-3 flex flex-col gap-4 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-heading text-xl font-semibold text-ink">Set homework</h3>
              <p className="mt-1 text-sm text-ink-muted">
                Students and their parents will see this immediately.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-1.5 text-ink-muted hover:bg-surface-2 hover:text-ink"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-soft">
              Class
              <select
                value={cohortId}
                onChange={(e) => setCohortId(e.target.value)}
                className="input"
                required
              >
                <option value="">Select a class…</option>
                {cohorts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {cohorts.length === 0 && (
                <span className="field-hint">You are not assigned to any class yet.</span>
              )}
            </label>

            <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-soft">
              Subject
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Integrated Science"
                className="input"
                required
              />
            </label>
          </div>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-soft">
            Title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Water filtration write-up"
              className="input"
              required
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-soft">
            Instructions
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={4}
              placeholder="What should the students do?"
              className="input resize-none"
              required
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-soft">
            Due date
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="input pl-9"
                required
              />
            </div>
          </label>

          {error && (
            <p className="flex items-center gap-2 text-sm text-danger">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="btn btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={!canSave || saving} className="btn btn-primary">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {saving ? "Saving…" : "Set homework"}
            </button>
          </div>
        </form>
      </motion.div>
    </>
  );
}
