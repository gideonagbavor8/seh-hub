"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useDashboard } from "@/context/DashboardContext";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { CalendarDays, MapPin, AlertTriangle, Clock } from "lucide-react";

interface Slot {
  id: string;
  cohort_id: string;
  cohort_name: string;
  day_of_week: number; // 1 = Mon … 7 = Sun
  start_time: string; // "07:30"
  end_time: string;
  subject: string;
  room: string | null;
  teacher_name: string | null;
}

const DAYS = [
  { n: 1, short: "Mon", long: "Monday" },
  { n: 2, short: "Tue", long: "Tuesday" },
  { n: 3, short: "Wed", long: "Wednesday" },
  { n: 4, short: "Thu", long: "Thursday" },
  { n: 5, short: "Fri", long: "Friday" },
];

/** Minutes since midnight, for "is this period now?" comparisons. */
function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function isBreak(subject: string) {
  return /^(break|lunch|assembly|closing)/i.test(subject.trim());
}

export default function SchedulePage() {
  const { setPageTitle } = useDashboard();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [now, setNow] = useState<{ day: number; minutes: number } | null>(null);
  const [activeDay, setActiveDay] = useState(1);

  useEffect(() => {
    setPageTitle("Schedule");
  }, [setPageTitle]);

  // Computed after mount so server and client markup cannot disagree.
  useEffect(() => {
    const d = new Date();
    const day = d.getDay() === 0 ? 7 : d.getDay();
    setNow({ day, minutes: d.getHours() * 60 + d.getMinutes() });
    setActiveDay(day >= 1 && day <= 5 ? day : 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/timetable")
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j.success) setSlots(j.data);
        else setFailed(true);
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
    const map = new Map<number, Slot[]>();
    for (const s of slots) {
      if (!map.has(s.day_of_week)) map.set(s.day_of_week, []);
      map.get(s.day_of_week)!.push(s);
    }
    for (const list of map.values()) {
      list.sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time));
    }
    return map;
  }, [slots]);

  const cohortName = slots[0]?.cohort_name ?? "";

  function isCurrent(s: Slot) {
    if (!now || now.day !== s.day_of_week) return false;
    const m = now.minutes;
    return m >= toMinutes(s.start_time) && m < toMinutes(s.end_time);
  }

  function SlotCard({ s, compact = false }: { s: Slot; compact?: boolean }) {
    const brk = isBreak(s.subject);
    const current = isCurrent(s);

    return (
      <div
        className={`rounded-xl border p-3 transition-colors ${
          current
            ? "border-primary bg-primary-soft"
            : brk
              ? "border-dashed border-line bg-surface-2"
              : "border-line bg-surface"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <span
            className={`tabular text-[11px] font-semibold ${
              current ? "text-primary" : "text-ink-muted"
            }`}
          >
            {s.start_time}–{s.end_time}
          </span>
          {current && (
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-primary">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
              Now
            </span>
          )}
        </div>

        <p
          className={`mt-1 font-heading text-sm font-semibold ${
            brk ? "text-ink-muted" : "text-ink"
          }`}
        >
          {s.subject}
        </p>

        {!brk && !compact && (s.teacher_name || s.room) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-muted">
            {s.teacher_name && <span className="truncate">{s.teacher_name}</span>}
            {s.room && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {s.room}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8">
      <SplitReveal>
        <div>
          <h2 className="font-heading text-3xl font-semibold text-ink sm:text-[38px]">Schedule</h2>
          <div className="rule-accent mt-3" />
          <p className="mt-3 text-sm text-ink-muted">
            {cohortName ? `Weekly timetable for ${cohortName}.` : "Your weekly timetable."}
          </p>
        </div>
      </SplitReveal>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {DAYS.map((d) => (
            <div key={d.n} className="card space-y-3 p-4">
              <div className="skeleton h-4 w-16" />
              <div className="skeleton h-16 w-full" />
              <div className="skeleton h-16 w-full" />
            </div>
          ))}
        </div>
      ) : failed ? (
        <div className="card flex items-center gap-3 p-5 text-sm text-ink-soft">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 text-warning" />
          Your timetable could not be loaded right now.
        </div>
      ) : slots.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-2 px-8 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-2 text-ink-muted">
            <CalendarDays className="h-5 w-5" />
          </span>
          <p className="mt-1 text-sm font-medium text-ink">No timetable published yet</p>
          <p className="max-w-sm text-sm text-ink-muted">
            Once the school office publishes the timetable for your class, it will appear here.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile: one day at a time */}
          <div className="lg:hidden">
            <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
              {DAYS.map((d) => {
                const isToday = now?.day === d.n;
                return (
                  <button
                    key={d.n}
                    onClick={() => setActiveDay(d.n)}
                    aria-pressed={activeDay === d.n}
                    className={`flex-shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                      activeDay === d.n
                        ? "bg-primary text-on-primary"
                        : "bg-surface-2 text-ink-soft hover:text-ink"
                    }`}
                  >
                    {d.short}
                    {isToday && activeDay !== d.n && (
                      <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-primary align-middle" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-2.5">
              {(byDay.get(activeDay) ?? []).length === 0 ? (
                <div className="card p-8 text-center text-sm text-ink-muted">
                  No periods scheduled for {DAYS.find((d) => d.n === activeDay)?.long}.
                </div>
              ) : (
                (byDay.get(activeDay) ?? []).map((s) => <SlotCard key={s.id} s={s} />)
              )}
            </div>
          </div>

          {/* Desktop: the whole week at a glance */}
          <div className="hidden gap-3 lg:grid lg:grid-cols-5">
            {DAYS.map((d, i) => {
              const isToday = now?.day === d.n;
              const list = byDay.get(d.n) ?? [];

              return (
                <motion.section
                  key={d.n}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className={`card flex flex-col gap-2.5 p-4 ${
                    isToday ? "ring-1 ring-primary" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3
                      className={`font-heading text-sm font-semibold ${
                        isToday ? "text-primary" : "text-ink"
                      }`}
                    >
                      {d.long}
                    </h3>
                    {isToday && (
                      <span className="badge-primary text-[10px]">Today</span>
                    )}
                  </div>

                  {list.length === 0 ? (
                    <p className="py-6 text-center text-xs text-ink-muted">No periods</p>
                  ) : (
                    list.map((s) => <SlotCard key={s.id} s={s} compact />)
                  )}
                </motion.section>
              );
            })}
          </div>

          <p className="flex items-center gap-2 text-xs text-ink-muted">
            <Clock className="h-3.5 w-3.5" />
            Times shown are the school&apos;s local timetable. The current period is highlighted.
          </p>
        </>
      )}
    </div>
  );
}
