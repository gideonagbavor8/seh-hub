"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useDashboard } from "@/context/DashboardContext";
import { SplitReveal } from "@/components/motion/SplitReveal";
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Megaphone,
  AlertTriangle,
  CalendarDays,
  Check,
  Clock,
} from "lucide-react";

interface ChildStatus {
  id: string;
  name: string;
  completed: boolean;
}

interface Entry {
  id: string;
  kind: "homework" | "notice";
  date: string; // YYYY-MM-DD
  title: string;
  detail: string;
  subject?: string;
  cohortName?: string;
  emergency?: boolean;
  children?: ChildStatus[] | null;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Local YYYY-MM-DD. Using toISOString here would shift the day in UTC+0 rollovers. */
function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Monday-first grid covering the whole month, padded to complete weeks. */
function buildGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7; // shift Sunday=0 to Monday=0
  const start = new Date(year, month, 1 - lead);

  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    cells.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }
  // Drop a trailing all-next-month week rather than always showing six rows.
  return cells.slice(0, cells[35].getMonth() === month ? 42 : 35);
}

export default function CalendarPage() {
  const { setPageTitle } = useDashboard();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [cursor, setCursor] = useState<{ y: number; m: number } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [today, setToday] = useState<string | null>(null);

  useEffect(() => {
    setPageTitle("Calendar");
  }, [setPageTitle]);

  // After mount, so server and client markup cannot disagree on "today".
  useEffect(() => {
    const now = new Date();
    setCursor({ y: now.getFullYear(), m: now.getMonth() });
    setToday(dayKey(now));
    setSelected(dayKey(now));
  }, []);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetch("/api/homework").then((r) => r.json()),
      fetch("/api/announcements?limit=50").then((r) => r.json()),
    ])
      .then(([hw, ann]) => {
        if (cancelled) return;

        const out: Entry[] = [];

        if (hw?.success) {
          for (const h of hw.data) {
            out.push({
              id: `hw-${h.id}`,
              kind: "homework",
              date: dayKey(new Date(h.due_date)),
              title: h.title,
              detail: h.instructions,
              subject: h.subject,
              cohortName: h.cohort_name,
              children: h.children,
            });
          }
        }

        if (ann?.success) {
          for (const a of ann.data) {
            out.push({
              id: `an-${a.id}`,
              kind: "notice",
              date: dayKey(new Date(a.createdAt)),
              title: a.title,
              detail: a.body,
              cohortName: a.cohortName,
              emergency: a.priority === "emergency",
            });
          }
        }

        if (!hw?.success && !ann?.success) setFailed(true);
        setEntries(out);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const byDay = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const e of entries) {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date)!.push(e);
    }
    return map;
  }, [entries]);

  const grid = useMemo(
    () => (cursor ? buildGrid(cursor.y, cursor.m) : []),
    [cursor]
  );

  const monthLabel = cursor
    ? new Date(cursor.y, cursor.m, 1).toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
      })
    : "";

  const selectedEntries = selected ? (byDay.get(selected) ?? []) : [];

  function shiftMonth(by: number) {
    setCursor((c) => {
      if (!c) return c;
      const d = new Date(c.y, c.m + by, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8">
      <SplitReveal>
        <div>
          <h2 className="font-heading text-3xl font-semibold text-ink sm:text-[38px]">Calendar</h2>
          <div className="rule-accent mt-3" />
          <p className="mt-3 text-sm text-ink-muted">
            Homework deadlines and school notices, laid out by date.
          </p>
        </div>
      </SplitReveal>

      {loading || !cursor ? (
        <div className="card space-y-4 p-5">
          <div className="skeleton h-6 w-40" />
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="skeleton h-14 w-full" />
            ))}
          </div>
        </div>
      ) : failed ? (
        <div className="card flex items-center gap-3 p-5 text-sm text-ink-soft">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 text-warning" />
          The calendar could not be loaded right now.
        </div>
      ) : (
        <>
          <div className="card overflow-hidden p-4 sm:p-5">
            {/* Month header */}
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="font-heading text-lg font-semibold text-ink">{monthLabel}</h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => shiftMonth(-1)}
                  className="rounded-xl p-2 text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    const now = new Date();
                    setCursor({ y: now.getFullYear(), m: now.getMonth() });
                    setSelected(dayKey(now));
                  }}
                  className="rounded-xl px-3 py-2 text-xs font-semibold text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink"
                >
                  Today
                </button>
                <button
                  onClick={() => shiftMonth(1)}
                  className="rounded-xl p-2 text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink"
                  aria-label="Next month"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Weekday header */}
            <div className="mb-1 grid grid-cols-7 gap-1 sm:gap-2">
              {WEEKDAYS.map((d) => (
                <div
                  key={d}
                  className="pb-1 text-center text-[11px] font-semibold uppercase tracking-wide text-ink-muted"
                >
                  <span className="sm:hidden">{d[0]}</span>
                  <span className="hidden sm:inline">{d}</span>
                </div>
              ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {grid.map((d) => {
                const key = dayKey(d);
                const inMonth = d.getMonth() === cursor.m;
                const items = byDay.get(key) ?? [];
                const isToday = key === today;
                const isSelected = key === selected;
                const hasHomework = items.some((e) => e.kind === "homework");
                const hasNotice = items.some((e) => e.kind === "notice");

                return (
                  <button
                    key={key}
                    onClick={() => setSelected(key)}
                    aria-pressed={isSelected}
                    aria-label={`${d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}${
                      items.length ? `, ${items.length} item${items.length === 1 ? "" : "s"}` : ""
                    }`}
                    className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border text-sm transition-colors ${
                      isSelected
                        ? "border-primary bg-primary text-on-primary"
                        : isToday
                          ? "border-primary bg-primary-soft text-primary"
                          : inMonth
                            ? "border-line bg-surface text-ink hover:bg-surface-2"
                            : "border-transparent text-ink-muted/50"
                    }`}
                  >
                    <span className={`tabular ${isToday && !isSelected ? "font-bold" : ""}`}>
                      {d.getDate()}
                    </span>

                    <span className="flex h-1.5 items-center gap-0.5">
                      {hasHomework && (
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isSelected ? "bg-on-primary" : "bg-primary"
                          }`}
                        />
                      )}
                      {hasNotice && (
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isSelected ? "bg-on-primary/60" : "bg-accent"
                          }`}
                        />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-line pt-3 text-xs text-ink-muted">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Homework due
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                School notice
              </span>
            </div>
          </div>

          {/* Agenda for the selected day */}
          <section className="flex flex-col gap-3">
            <h3 className="section-title">
              {selected
                ? new Date(selected + "T00:00:00").toLocaleDateString("en-GB", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })
                : "Select a day"}
            </h3>

            {selectedEntries.length === 0 ? (
              <div className="card flex flex-col items-center justify-center gap-2 px-8 py-12 text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-2 text-ink-muted">
                  <CalendarDays className="h-5 w-5" />
                </span>
                <p className="mt-1 text-sm text-ink-muted">Nothing scheduled for this day.</p>
              </div>
            ) : (
              <ul className="flex flex-col gap-3">
                {selectedEntries.map((e, i) => (
                  <motion.li
                    key={e.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: Math.min(i, 5) * 0.04 }}
                    className="card p-5"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl ${
                          e.kind === "homework"
                            ? "bg-primary-soft text-primary"
                            : e.emergency
                              ? "bg-danger-soft text-danger"
                              : "bg-accent-soft text-accent-ink"
                        }`}
                      >
                        {e.kind === "homework" ? (
                          <BookOpen className="h-4 w-4" />
                        ) : (
                          <Megaphone className="h-4 w-4" />
                        )}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {e.subject && <span className="badge-primary">{e.subject}</span>}
                          {e.cohortName && <span className="badge-neutral">{e.cohortName}</span>}
                          {e.emergency && (
                            <span className="badge-danger">
                              <AlertTriangle className="h-3 w-3" />
                              Emergency
                            </span>
                          )}
                          {e.kind === "homework" && (
                            <span className="badge-warning">
                              <Clock className="h-3 w-3" />
                              Due
                            </span>
                          )}
                        </div>

                        <h4 className="mt-2 font-heading text-base font-semibold text-ink">
                          {e.title}
                        </h4>
                        <p className="mt-1 line-clamp-3 whitespace-pre-line text-sm leading-relaxed text-ink-soft">
                          {e.detail}
                        </p>

                        {e.children && e.children.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {e.children.map((c) => (
                              <span
                                key={c.id}
                                className={c.completed ? "badge-primary" : "badge-warning"}
                              >
                                {c.completed ? (
                                  <Check className="h-3 w-3" />
                                ) : (
                                  <Clock className="h-3 w-3" />
                                )}
                                {c.name.split(" ")[0]} — {c.completed ? "done" : "not yet"}
                              </span>
                            ))}
                          </div>
                        )}

                        <Link
                          href={e.kind === "homework" ? "/dashboard/homework" : "/dashboard/feed"}
                          className="mt-3 inline-block text-sm font-semibold text-primary hover:underline"
                        >
                          {e.kind === "homework" ? "Open homework" : "Read notice"}
                        </Link>
                      </div>
                    </div>
                  </motion.li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
