"use client";

import React, { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useDashboard } from "@/context/DashboardContext";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { ClipReveal } from "@/components/motion/ClipReveal";
import { CountUp } from "@/components/motion/CountUp";
import {
  Megaphone,
  BookOpen,
  Calendar,
  Baby,
  MessageSquare,
  TrendingUp,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  body: string;
  priority: "standard" | "emergency";
  createdAt: string;
  authorName: string;
}

// NOTE: still placeholder figures — see the project audit.
const getStats = (role: string) => {
  switch (role) {
    case "parent":
      return [
        { value: 2, label: "My Children",       icon: Baby,          trend: "stable" },
        { value: 4, label: "New Announcements", icon: Megaphone,     trend: "+4"     },
        { value: 1, label: "Unread Messages",   icon: MessageSquare, trend: "+1"     },
      ];
    case "student":
      return [
        { value: 3, label: "New Announcements",  icon: Megaphone, trend: "+3" },
        { value: 2, label: "Homework Due",       icon: BookOpen,  trend: "+2" },
        { value: 4, label: "Days to Next Event", icon: Calendar,  trend: ""   },
      ];
    default:
      return [{ value: 0, label: "Announcements", icon: Megaphone, trend: "" }];
  }
};

export default function FeedPage() {
  const { user, setPageTitle } = useDashboard();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [date, setDate] = useState("");
  const [greeting, setGreeting] = useState("Good morning");

  useEffect(() => {
    setPageTitle("Feed");

    const hour = new Date().getHours();
    if (hour >= 12 && hour < 17) setGreeting("Good afternoon");
    else if (hour >= 17) setGreeting("Good evening");
    else setGreeting("Good morning");

    setDate(
      new Date().toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    );
  }, [setPageTitle]);

  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await fetch("/api/announcements/recent");
      const json = await res.json();
      if (json.success) setAnnouncements(json.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnnouncements();
  };

  const stats = getStats(user.role);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8">
      {/* ── Greeting ── */}
      <SplitReveal>
        <div>
          <h2 className="font-heading text-3xl font-semibold text-ink sm:text-[38px]">
            {greeting}, <span className="text-primary">{user.full_name}</span>
          </h2>
          <div className="rule-accent mt-3" />
          <p className="mt-3 text-sm text-ink-muted">{date}</p>
        </div>
      </SplitReveal>

      {/* ── Stats ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
              className="card p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-heading text-[34px] font-semibold leading-none text-ink">
                    <CountUp to={stat.value} duration={1100} delay={i * 90} />
                  </p>
                  <p className="mt-2 truncate text-sm font-medium text-ink-soft">
                    {stat.label}
                  </p>
                  {stat.trend && stat.trend !== "stable" && (
                    <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-primary">
                      <TrendingUp className="h-3.5 w-3.5" />
                      {stat.trend} this week
                    </p>
                  )}
                </div>

                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <Icon className="h-5 w-5" />
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── Announcement Feed ── */}
      <ClipReveal from="bottom" delay={0.1} className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="section-title">From your school</h3>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-ghost px-3 py-1.5 text-sm"
            id="feed-refresh-btn"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <div className="card overflow-hidden">
          {loading ? (
            <div className="divide-y divide-line">
              {[1, 2, 3].map((n) => (
                <div key={n} className="space-y-2.5 p-5">
                  <div className="skeleton h-4 w-2/5" />
                  <div className="skeleton h-3 w-3/4" />
                  <div className="skeleton h-3 w-1/4" />
                </div>
              ))}
            </div>
          ) : announcements.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-8 py-16 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-2 text-ink-muted">
                <Megaphone className="h-5 w-5" />
              </span>
              <p className="mt-1 text-sm font-medium text-ink">Nothing new right now</p>
              <p className="text-sm text-ink-muted">
                Announcements from your school will appear here.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {announcements.map((ann) => (
                <li key={ann.id} className="p-5">
                  <div className="flex gap-3">
                    <span
                      aria-hidden="true"
                      className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${
                        ann.priority === "emergency" ? "bg-danger" : "bg-primary"
                      }`}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <h4 className="font-heading text-[15px] font-semibold text-ink">
                          {ann.title}
                        </h4>
                        {ann.priority === "emergency" && (
                          <span className="badge-danger">
                            <AlertTriangle className="h-3 w-3" />
                            Emergency
                          </span>
                        )}
                      </div>

                      <p className="text-sm leading-relaxed text-ink-soft">{ann.body}</p>

                      <p className="mt-2 text-xs text-ink-muted">
                        <span className="font-medium text-ink-soft">{ann.authorName}</span>
                        {" · "}
                        {new Date(ann.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </ClipReveal>
    </div>
  );
}
