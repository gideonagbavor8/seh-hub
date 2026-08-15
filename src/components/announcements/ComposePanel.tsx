"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, PanInfo, useReducedMotion } from "framer-motion";
import { X, AlertTriangle, Check, Loader2, ShieldCheck } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";

interface Cohort {
  id: string;
  name: string;
}

interface ComposePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  cohorts: Cohort[];
}

export default function ComposePanel({
  isOpen,
  onClose,
  onSuccess,
  cohorts,
}: ComposePanelProps) {
  const { user } = useDashboard();
  const reduceMotion = useReducedMotion();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [selectedCohorts, setSelectedCohorts] = useState<string[]>([]);
  const [schoolWide, setSchoolWide] = useState(false);
  const [priority, setPriority] = useState<"standard" | "emergency">("standard");
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isAdmin = user.role === "admin";

  // Auto-grow textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [body]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const reset = () => {
    setTitle("");
    setBody("");
    setSelectedCohorts([]);
    setSchoolWide(false);
    setPriority("standard");
    setError("");
    setShowSuccess(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 100) {
      handleClose();
    }
  };

  const toggleCohort = (id: string) => {
    setSchoolWide(false);
    setSelectedCohorts((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!title.trim() || !body.trim()) {
      setError("Add a title and a message before posting.");
      return;
    }

    if (!isAdmin && selectedCohorts.length === 0) {
      setError("Choose at least one class to post to.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      // For school-wide, cohortId is null; otherwise post per cohort
      const cohortIds = isAdmin && schoolWide ? [null] : selectedCohorts;

      for (const cohortId of cohortIds) {
        const res = await fetch("/api/announcements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            body: body.trim(),
            cohortId,
            priority,
          }),
        });

        const json = await res.json();
        if (!json.success) {
          throw new Error(json.error || "Failed to post");
        }
      }

      setShowSuccess(true);
      setTimeout(() => {
        handleClose();
        onSuccess();
      }, 1400);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post announcement");
    } finally {
      setSubmitting(false);
    }
  };

  const chipClass = (active: boolean) =>
    `rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors duration-150 ${
      active
        ? "border-primary bg-primary text-on-primary"
        : "border-line-strong bg-surface text-ink-soft hover:border-primary hover:text-ink"
    }`;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={handleClose}
            className="fixed inset-0 z-50 bg-ink/30"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="New announcement"
            initial={reduceMotion ? { opacity: 0 } : { y: "100%" }}
            animate={reduceMotion ? { opacity: 1 } : { y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { y: "100%" }}
            transition={{ type: "spring" as const, stiffness: 320, damping: 32 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-line bg-surface"
            style={{ boxShadow: "var(--shadow-lift)" }}
          >
            {/* Drag handle */}
            <div className="flex cursor-grab justify-center pb-2 pt-3 active:cursor-grabbing">
              <div className="h-1 w-10 rounded-full bg-line-strong" />
            </div>

            {showSuccess ? (
              <div className="flex flex-col items-center justify-center gap-3 py-20">
                <motion.span
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring" as const, stiffness: 320, damping: 22 }}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft"
                >
                  <Check className="h-7 w-7 text-primary" />
                </motion.span>
                <p className="font-heading text-lg font-semibold text-ink">
                  Announcement posted
                </p>
              </div>
            ) : (
              <div className="space-y-5 px-5 pb-8 sm:px-6">
                {/* Header */}
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-heading text-xl font-semibold text-ink">
                    New announcement
                  </h2>
                  <button
                    onClick={handleClose}
                    className="rounded-xl p-2 text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Title */}
                <div>
                  <label htmlFor="compose-title" className="field-label">
                    Title
                  </label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Mid-term break dates"
                    className="input"
                    id="compose-title"
                  />
                </div>

                {/* Body */}
                <div>
                  <label htmlFor="compose-body" className="field-label">
                    Message
                  </label>
                  <textarea
                    ref={textareaRef}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Write your announcement…"
                    rows={4}
                    className="input resize-none"
                    id="compose-body"
                  />
                </div>

                {/* Audience */}
                <div>
                  <p className="field-label">Who should see this?</p>
                  <div className="flex flex-wrap gap-2">
                    {isAdmin && (
                      <button
                        type="button"
                        aria-pressed={schoolWide}
                        onClick={() => {
                          setSchoolWide(!schoolWide);
                          setSelectedCohorts([]);
                        }}
                        className={chipClass(schoolWide)}
                      >
                        Whole school
                      </button>
                    )}
                    {cohorts.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        aria-pressed={selectedCohorts.includes(c.id)}
                        onClick={() => toggleCohort(c.id)}
                        className={chipClass(selectedCohorts.includes(c.id))}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                  {cohorts.length === 0 && !isAdmin && (
                    <p className="field-hint">
                      No classes available to post to yet.
                    </p>
                  )}
                </div>

                {/* Priority */}
                <div>
                  <p className="field-label">Priority</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      aria-pressed={priority === "standard"}
                      onClick={() => setPriority("standard")}
                      className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors duration-150 ${
                        priority === "standard"
                          ? "border-primary bg-primary-soft text-primary"
                          : "border-line-strong bg-surface text-ink-soft hover:text-ink"
                      }`}
                    >
                      Standard
                    </button>
                    <button
                      type="button"
                      aria-pressed={priority === "emergency"}
                      onClick={() => setPriority("emergency")}
                      className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors duration-150 ${
                        priority === "emergency"
                          ? "border-danger bg-danger text-white"
                          : "border-line-strong bg-surface text-ink-soft hover:text-ink"
                      }`}
                    >
                      Emergency
                    </button>
                  </div>

                  {priority === "emergency" && (
                    <div className="mt-2 flex items-start gap-2 rounded-xl bg-danger-soft px-3 py-2.5">
                      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-danger" />
                      <span className="text-sm text-ink-soft">
                        This sends an SMS to every parent with a phone number on file.
                      </span>
                    </div>
                  )}
                </div>

                {/* Signing notice */}
                {isAdmin && (
                  <div className="flex items-start gap-2 rounded-xl bg-primary-soft px-3 py-2.5">
                    <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <span className="text-sm text-ink-soft">
                      This notice will be cryptographically signed so families can confirm
                      it genuinely came from the school.
                    </span>
                  </div>
                )}

                {error && (
                  <p role="alert" className="text-sm font-medium text-danger">
                    {error}
                  </p>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="btn-primary w-full py-3"
                  id="compose-submit"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Posting…
                    </>
                  ) : (
                    "Post announcement"
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
