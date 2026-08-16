"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { useDashboard } from "@/context/DashboardContext";
import AnnouncementCard, { type AnnouncementData } from "@/components/announcements/AnnouncementCard";
import ComposePanel from "@/components/announcements/ComposePanel";
import { Plus, Megaphone } from "lucide-react";

type FilterTab = "all" | "standard" | "emergency";

interface Cohort {
  id: string;
  name: string;
}

function CardSkeleton() {
  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="skeleton h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-3 w-1/3" />
          <div className="skeleton h-2.5 w-1/5" />
        </div>
      </div>
      <div className="skeleton mb-2 h-4 w-2/3" />
      <div className="skeleton mb-1.5 h-3 w-full" />
      <div className="skeleton h-3 w-4/5" />
    </div>
  );
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

  // Cohorts for the compose panel's class selector. The endpoint is
  // admin/teacher only and returns 403 otherwise, so only fetch when the user
  // can actually compose. Admins get every cohort in the school; teachers get
  // just the ones they are assigned to.
  useEffect(() => {
    if (!canCompose) return;

    let cancelled = false;

    fetch("/api/cohorts")
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled && j.success && Array.isArray(j.data)) setCohorts(j.data);
      })
      .catch((err) => console.error("Failed to load cohorts:", err));

    return () => {
      cancelled = true;
    };
  }, [canCompose]);

  const fetchAnnouncements = useCallback(async (reset = false) => {
    const currentOffset = reset ? 0 : offsetRef.current;

    if (reset) {
      setLoading(true);
      setHasMore(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const res = await fetch(`/api/announcements?limit=20&offset=${currentOffset}`);
      const json = await res.json();

      if (json.success) {
        const data = json.data as AnnouncementData[];
        if (json.publicKey) setPublicKey(json.publicKey);

        setAnnouncements((prev) => (reset ? data : [...prev, ...data]));

        offsetRef.current = currentOffset + data.length;
        if (data.length < 20) setHasMore(false);
      }
    } catch (err) {
      console.error("Failed to fetch announcements:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

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

  const filtered =
    filter === "all" ? announcements : announcements.filter((a) => a.priority === filter);

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
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-3xl font-semibold text-ink">Announcements</h2>
          <div className="rule-accent mt-3" />
          <p className="mt-3 text-sm text-ink-muted">
            Signed notices from your school, newest first.
          </p>
        </div>

        {canCompose && (
          <button
            onClick={() => setComposeOpen(true)}
            className="btn-primary"
            id="compose-btn"
          >
            <Plus className="h-4 w-4" />
            New post
          </button>
        )}
      </div>

      {/* ── Filter tabs ── */}
      <div
        role="tablist"
        aria-label="Filter announcements"
        className="flex w-fit items-center gap-1 rounded-xl border border-line bg-surface-2 p-1"
      >
        {tabs.map((tab) => {
          const isActive = filter === tab.value;
          return (
            <button
              key={tab.value}
              role="tab"
              aria-selected={isActive}
              onClick={() => setFilter(tab.value)}
              className={`relative rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors duration-150 ${
                isActive ? "text-ink" : "text-ink-muted hover:text-ink"
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="filter-pill"
                  className="absolute inset-0 rounded-lg bg-surface"
                  style={{ zIndex: -1, boxShadow: "var(--shadow-soft)" }}
                  transition={{ type: "spring" as const, stiffness: 400, damping: 34 }}
                />
              )}
              <span className="relative">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Feed ── */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <CardSkeleton key={n} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-2 px-8 py-20 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2 text-ink-muted">
            <Megaphone className="h-6 w-6" />
          </span>
          <p className="mt-2 font-heading text-lg font-semibold text-ink">
            {filter === "all" ? "No announcements yet" : `No ${filter} announcements`}
          </p>
          <p className="max-w-sm text-sm text-ink-muted">
            {canCompose
              ? "Post one to let parents and students know what's happening."
              : "Check back soon — school updates will appear here."}
          </p>
          {canCompose && filter === "all" && (
            <button onClick={() => setComposeOpen(true)} className="btn-primary mt-3">
              <Plus className="h-4 w-4" />
              New post
            </button>
          )}
        </div>
      ) : (
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

          {hasMore && (
            <div ref={sentinelRef}>
              {loadingMore && (
                <div className="space-y-4 pt-2">
                  {[1, 2].map((n) => (
                    <CardSkeleton key={n} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <ComposePanel
        isOpen={composeOpen}
        onClose={() => setComposeOpen(false)}
        onSuccess={handleComposeSuccess}
        cohorts={cohorts}
      />
    </div>
  );
}
