"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { useDashboard } from "@/context/DashboardContext";
import { ScrambleText } from "@/components/motion/ScrambleText";
import { MagneticButton } from "@/components/motion/MagneticButton";
import AnnouncementCard, { type AnnouncementData } from "@/components/announcements/AnnouncementCard";
import ComposePanel from "@/components/announcements/ComposePanel";
import { Plus, Megaphone, Filter } from "lucide-react";

type FilterTab = "all" | "standard" | "emergency";

interface Cohort {
  id: string;
  name: string;
}

export default function AnnouncementsPage() {
  const { user, setPageTitle } = useDashboard();

  const [announcements, setAnnouncements] = useState<AnnouncementData[]>([]);
  const [publicKey, setPublicKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [composeOpen, setComposeOpen] = useState(false);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);

  const offsetRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const canCompose = user.role === "admin" || user.role === "teacher";

  useEffect(() => {
    setPageTitle("Announcements");
  }, [setPageTitle]);

  // Fetch cohorts for compose panel
  useEffect(() => {
    if (!canCompose) return;
    // TODO: Fetch from /api/cohorts — for now use empty list
    // Cohorts will be loaded when compose panel opens
  }, [canCompose]);

  const fetchAnnouncements = useCallback(
    async (reset = false) => {
      const currentOffset = reset ? 0 : offsetRef.current;

      if (reset) {
        setLoading(true);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const res = await fetch(
          `/api/announcements?limit=20&offset=${currentOffset}`
        );
        const json = await res.json();

        if (json.success) {
          const data = json.data as AnnouncementData[];
          if (json.publicKey) setPublicKey(json.publicKey);

          if (reset) {
            setAnnouncements(data);
          } else {
            setAnnouncements((prev) => [...prev, ...data]);
          }

          offsetRef.current = currentOffset + data.length;
          if (data.length < 20) setHasMore(false);
        }
      } catch (err) {
        console.error("Failed to fetch announcements:", err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  // Initial fetch
  useEffect(() => {
    fetchAnnouncements(true);
  }, [fetchAnnouncements]);

  // Infinite scroll
  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loadingMore && !loading && hasMore) {
          fetchAnnouncements(false);
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, fetchAnnouncements]);

  // Filter
  const filtered =
    filter === "all"
      ? announcements
      : announcements.filter((a) => a.priority === filter);

  const handleFilterChange = (tab: FilterTab) => {
    setFilter(tab);
  };

  const handleComposeSuccess = () => {
    offsetRef.current = 0;
    fetchAnnouncements(true);
  };

  const tabs: { label: string; value: FilterTab }[] = [
    { label: "All", value: "all" },
    { label: "Standard", value: "standard" },
    { label: "Emergency", value: "emergency" },
  ];

  return (
    <div className="flex-1 flex flex-col gap-6 max-w-3xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Megaphone className="h-5 w-5 text-[#00E324]" />
          <h1 className="text-2xl sm:text-3xl font-extrabold font-heading tracking-tight text-white">
            <ScrambleText text="Announcements" delay={100} duration={700} />
          </h1>
        </div>

        {canCompose && (
          <MagneticButton
            onClick={() => setComposeOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#00E324] text-black text-sm font-bold font-heading hover:bg-[#00B81E] transition-colors"
            id="compose-btn"
          >
            <Plus className="h-4 w-4" />
            Post
          </MagneticButton>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-[#111111] border border-[#1A1A1A] w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => handleFilterChange(tab.value)}
            className={`relative px-4 py-2 rounded-lg text-[12px] font-semibold font-heading uppercase tracking-wider transition-all duration-200 ${
              filter === tab.value
                ? "text-black"
                : "text-[#A0A0A0] hover:text-white"
            }`}
          >
            {filter === tab.value && (
              <motion.div
                layoutId="filter-pill"
                className={`absolute inset-0 rounded-lg ${
                  tab.value === "emergency" ? "bg-[#FF4444]" : "bg-[#00E324]"
                }`}
                style={{ zIndex: -1 }}
                transition={{ type: "spring" as const, stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative z-10">
              {filter === tab.value && tab.value === "emergency"
                ? "text-white"
                : ""}
              {tab.label}
            </span>
          </button>
        ))}
      </div>

      {/* Feed */}
      {loading ? (
        // Skeleton loaders
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="rounded-2xl bg-[#111111] border border-[#1A1A1A] p-5 animate-pulse"
              style={{ borderLeft: "3px solid rgba(0,227,36,0.15)" }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="h-9 w-9 rounded-full bg-[#1A1A1A]" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3 bg-[#1A1A1A] rounded w-1/3" />
                  <div className="h-2 bg-[#1A1A1A] rounded w-1/5" />
                </div>
              </div>
              <div className="h-4 bg-[#1A1A1A] rounded w-2/3 mb-2" />
              <div className="h-3 bg-[#1A1A1A] rounded w-full mb-1" />
              <div className="h-3 bg-[#1A1A1A] rounded w-4/5" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        // Empty state
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <svg
              width="80"
              height="80"
              viewBox="0 0 80 80"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                cx="40"
                cy="40"
                r="38"
                stroke="#00E324"
                strokeWidth="1"
                strokeDasharray="4 4"
                opacity="0.3"
              />
              <path
                d="M30 50V35a2 2 0 012-2h16a2 2 0 012 2v15a2 2 0 01-2 2H32a2 2 0 01-2-2z"
                stroke="#00E324"
                strokeWidth="1.5"
                opacity="0.5"
              />
              <path
                d="M35 33v-3a5 5 0 0110 0v3"
                stroke="#00E324"
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity="0.5"
              />
              <line
                x1="36"
                y1="40"
                x2="44"
                y2="40"
                stroke="#00E324"
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity="0.4"
              />
              <line
                x1="36"
                y1="44"
                x2="40"
                y2="44"
                stroke="#00E324"
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity="0.4"
              />
            </svg>
          </motion.div>
          <p className="text-sm text-[#A0A0A0] font-medium font-sans">
            No announcements yet
          </p>
          <p className="text-xs text-[#A0A0A0]/50 font-sans">
            {canCompose
              ? "Post one to get started."
              : "Check back soon for updates."}
          </p>
        </div>
      ) : (
        // Announcement list
        <div className="space-y-4">
          {filtered.map((ann, i) => (
            <AnnouncementCard
              key={ann.id}
              announcement={ann}
              index={i}
              publicKey={publicKey}
              userRole={user.role}
            />
          ))}

          {/* Infinite scroll sentinel */}
          {hasMore && (
            <div ref={sentinelRef}>
              {loadingMore && (
                <div className="space-y-4 pt-2">
                  {[1, 2].map((n) => (
                    <div
                      key={n}
                      className="rounded-2xl bg-[#111111] border border-[#1A1A1A] p-5 animate-pulse"
                      style={{ borderLeft: "3px solid rgba(0,227,36,0.15)" }}
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className="h-9 w-9 rounded-full bg-[#1A1A1A]" />
                        <div className="space-y-1.5 flex-1">
                          <div className="h-3 bg-[#1A1A1A] rounded w-1/4" />
                          <div className="h-2 bg-[#1A1A1A] rounded w-1/6" />
                        </div>
                      </div>
                      <div className="h-4 bg-[#1A1A1A] rounded w-1/2 mb-2" />
                      <div className="h-3 bg-[#1A1A1A] rounded w-3/4" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Compose Panel */}
      <ComposePanel
        isOpen={composeOpen}
        onClose={() => setComposeOpen(false)}
        onSuccess={handleComposeSuccess}
        cohorts={cohorts}
      />
    </div>
  );
}
