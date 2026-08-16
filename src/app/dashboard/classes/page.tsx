"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useDashboard } from "@/context/DashboardContext";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { CountUp } from "@/components/motion/CountUp";
import {
  GraduationCap,
  Users,
  Megaphone,
  ChevronDown,
  AlertTriangle,
  Mail,
} from "lucide-react";

interface Student {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

interface ClassRow {
  id: string;
  name: string;
  academicYear: string;
  studentCount: number;
  parentCount: number;
  recentAnnouncementCount: number;
  students: Student[];
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function ClassSkeleton() {
  return (
    <div className="card space-y-4 p-5">
      <div className="skeleton h-5 w-40" />
      <div className="flex gap-6">
        <div className="skeleton h-8 w-14" />
        <div className="skeleton h-8 w-14" />
        <div className="skeleton h-8 w-14" />
      </div>
    </div>
  );
}

export default function ClassesPage() {
  const { user, setPageTitle } = useDashboard();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setPageTitle("My Classes");
  }, [setPageTitle]);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/teacher/classes")
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j.success && Array.isArray(j.data)) {
          setClasses(j.data);
          // Open the first class by default — with one or two cohorts, making
          // the teacher click again to see any students is just friction.
          if (j.data.length > 0) setExpanded(j.data[0].id);
        } else {
          setFailed(true);
        }
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

  // The endpoint is teacher-only and answers 403 for everyone else; say so
  // rather than showing an empty page.
  if (user.role !== "teacher") {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6">
        <div className="card flex items-center gap-3 p-5 text-sm text-ink-soft">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 text-warning" />
          Class lists are only available to teachers.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8">
      <SplitReveal>
        <div>
          <h2 className="font-heading text-3xl font-semibold text-ink sm:text-[38px]">
            My classes
          </h2>
          <div className="rule-accent mt-3" />
          <p className="mt-3 text-sm text-ink-muted">
            The cohorts you are assigned to, with their students and linked parents.
          </p>
        </div>
      </SplitReveal>

      {loading ? (
        <div className="flex flex-col gap-4">
          {[0, 1].map((n) => (
            <ClassSkeleton key={n} />
          ))}
        </div>
      ) : failed ? (
        <div className="card flex items-center gap-3 p-5 text-sm text-ink-soft">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 text-warning" />
          Your classes could not be loaded right now.
        </div>
      ) : classes.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-2 px-8 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-2 text-ink-muted">
            <GraduationCap className="h-5 w-5" />
          </span>
          <p className="mt-1 text-sm font-medium text-ink">No classes assigned yet</p>
          <p className="max-w-sm text-sm text-ink-muted">
            Once an administrator assigns you to a cohort, your students will appear here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {classes.map((cls, i) => {
            const isOpen = expanded === cls.id;

            return (
              <motion.section
                key={cls.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                className="card overflow-hidden"
              >
                <div className="flex flex-wrap items-start justify-between gap-4 p-5">
                  <div className="min-w-0">
                    <h3 className="font-heading text-xl font-semibold text-ink">{cls.name}</h3>
                    <p className="mt-1 text-sm text-ink-muted">{cls.academicYear}</p>
                  </div>

                  <dl className="flex flex-wrap gap-6">
                    {[
                      { label: "Students", value: cls.studentCount, Icon: GraduationCap },
                      { label: "Parents", value: cls.parentCount, Icon: Users },
                      { label: "Posts this week", value: cls.recentAnnouncementCount, Icon: Megaphone },
                    ].map(({ label, value, Icon }) => (
                      <div key={label} className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
                          <Icon className="h-4 w-4" />
                        </span>
                        <div>
                          <dd className="font-heading text-lg font-semibold leading-none text-ink tabular">
                            <CountUp to={value} duration={900} delay={i * 80} />
                          </dd>
                          <dt className="mt-1 text-xs text-ink-muted">{label}</dt>
                        </div>
                      </div>
                    ))}
                  </dl>
                </div>

                {cls.students.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : cls.id)}
                      aria-expanded={isOpen}
                      className="flex w-full items-center justify-between gap-3 border-t border-line px-5 py-3 text-sm font-semibold text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink"
                    >
                      <span>
                        {isOpen ? "Hide" : "Show"} {cls.students.length}{" "}
                        {cls.students.length === 1 ? "student" : "students"}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                      />
                    </button>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                          className="overflow-hidden"
                        >
                          <ul className="divide-y divide-line border-t border-line">
                            {cls.students.map((student) => (
                              <li
                                key={student.id}
                                className="flex items-center gap-3 px-5 py-3"
                              >
                                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-2 text-xs font-semibold text-ink-soft">
                                  {student.avatarUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={student.avatarUrl}
                                      alt=""
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    initials(student.name)
                                  )}
                                </span>

                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium text-ink">
                                    {student.name}
                                  </p>
                                  <p className="truncate text-xs text-ink-muted">
                                    {student.email}
                                  </p>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                )}
              </motion.section>
            );
          })}

          <p className="text-sm text-ink-muted">
            Need to reach a parent?{" "}
            <Link href="/dashboard/messages" className="font-semibold text-primary hover:underline">
              <Mail className="mr-1 inline h-3.5 w-3.5" />
              Open messages
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
