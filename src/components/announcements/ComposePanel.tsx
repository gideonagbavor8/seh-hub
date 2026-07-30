"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { X, Image, AlertTriangle, Check, Loader2 } from "lucide-react";
import { MagneticButton } from "@/components/motion/MagneticButton";
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
      setError("Title and body are required");
      return;
    }

    // Teacher must select a cohort
    if (!isAdmin && selectedCohorts.length === 0) {
      setError("Select at least one cohort");
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
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post announcement");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Panel */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring" as const, stiffness: 300, damping: 30 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[90vh] bg-[#0F0F0F] rounded-t-3xl overflow-y-auto"
            style={{ boxShadow: "0 -8px 40px rgba(0,0,0,0.5)" }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
              <div className="h-1 w-10 rounded-full bg-[#2A2A2A]" />
            </div>

            {/* Success animation */}
            {showSuccess ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring" as const, stiffness: 300, damping: 20 }}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-[#00E324]/20 border border-[#00E324]/30"
                >
                  <Check className="h-8 w-8 text-[#00E324]" />
                </motion.div>
                <p className="text-sm font-semibold text-[#00E324] font-heading">
                  Announcement posted!
                </p>
              </div>
            ) : (
              <div className="px-5 pb-8 space-y-5">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold font-heading text-white">
                    New Announcement
                  </h2>
                  <button
                    onClick={handleClose}
                    className="p-2 rounded-xl text-[#A0A0A0] hover:text-white hover:bg-[#1A1A1A] transition-colors"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Title */}
                <div className="relative">
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Announcement title"
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white text-sm font-sans placeholder-[#A0A0A0]/50 focus:outline-none focus:border-[#00E324] transition-colors"
                    id="compose-title"
                  />
                </div>

                {/* Body */}
                <textarea
                  ref={textareaRef}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write your announcement…"
                  rows={4}
                  className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white text-sm font-sans placeholder-[#A0A0A0]/50 focus:outline-none focus:border-[#00E324] transition-colors resize-none"
                  id="compose-body"
                />

                {/* Cohort selector */}
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-[#A0A0A0]/60 font-heading mb-2">
                    Target Audience
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {isAdmin && (
                      <button
                        onClick={() => {
                          setSchoolWide(!schoolWide);
                          setSelectedCohorts([]);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold font-heading border transition-all duration-200 ${
                          schoolWide
                            ? "bg-[#00E324] text-black border-[#00E324]"
                            : "bg-[#1A1A1A] text-[#A0A0A0] border-[#2A2A2A] hover:border-[#00E324]/30"
                        }`}
                      >
                        🏫 School-Wide
                      </button>
                    )}
                    {cohorts.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => toggleCohort(c.id)}
                        className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold font-heading border transition-all duration-200 ${
                          selectedCohorts.includes(c.id)
                            ? "bg-[#00E324] text-black border-[#00E324]"
                            : "bg-[#1A1A1A] text-[#A0A0A0] border-[#2A2A2A] hover:border-[#00E324]/30"
                        }`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Priority toggle */}
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-[#A0A0A0]/60 font-heading mb-2">
                    Priority
                  </p>
                  <div className="flex rounded-xl overflow-hidden border border-[#2A2A2A]">
                    <button
                      onClick={() => setPriority("standard")}
                      className={`flex-1 py-2.5 text-[12px] font-semibold font-heading transition-all duration-200 ${
                        priority === "standard"
                          ? "bg-[#00E324] text-black"
                          : "bg-[#1A1A1A] text-[#A0A0A0]"
                      }`}
                    >
                      Standard
                    </button>
                    <button
                      onClick={() => setPriority("emergency")}
                      className={`flex-1 py-2.5 text-[12px] font-semibold font-heading transition-all duration-200 ${
                        priority === "emergency"
                          ? "bg-[#FF4444] text-white shadow-[0_0_16px_rgba(255,68,68,0.4)]"
                          : "bg-[#1A1A1A] text-[#A0A0A0]"
                      }`}
                    >
                      🚨 Emergency
                    </button>
                  </div>

                  {priority === "emergency" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg bg-red-950/30 border border-red-500/20"
                    >
                      <AlertTriangle className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
                      <span className="text-[11px] text-red-300 font-sans">
                        This will trigger SMS to all parents
                      </span>
                    </motion.div>
                  )}
                </div>

                {/* Admin crypto preview */}
                {isAdmin && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#00E324]/5 border border-[#00E324]/10">
                    <span className="text-[10px] text-[#00E324]/70 font-heading uppercase tracking-wider">
                      🔐 Will be signed with Ed25519 on submit
                    </span>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <p className="text-[12px] text-red-400 font-sans">{error}</p>
                )}

                {/* Submit */}
                <MagneticButton
                  onClick={handleSubmit}
                  disabled={submitting}
                  className={`w-full py-3.5 rounded-xl text-sm font-bold font-heading transition-all duration-200 ${
                    submitting
                      ? "bg-[#00E324]/50 text-black/50 cursor-not-allowed"
                      : "bg-[#00E324] text-black hover:bg-[#00B81E]"
                  }`}
                  id="compose-submit"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Posting…
                    </span>
                  ) : (
                    "Post Announcement"
                  )}
                </MagneticButton>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
