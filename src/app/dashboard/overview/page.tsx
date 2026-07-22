"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useDashboard } from "@/context/DashboardContext";
import { ScrambleText } from "@/components/motion/ScrambleText";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { ClipReveal } from "@/components/motion/ClipReveal";
import { CountUp } from "@/components/motion/CountUp";
import {
  Users,
  GraduationCap,
  Megaphone,
  MessageSquare,
  BookOpen,
  Calendar,
  Baby,
  ArrowRight,
  TrendingUp,
  Activity,
  Zap,
} from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  body: string;
  priority: "standard" | "emergency";
  createdAt: string;
  authorName: string;
}

const getStats = (role: string) => {
  switch (role) {
    case "admin":
      return [
        { value: 248, label: "Total Students",       icon: GraduationCap, trend: "+12" },
        { value: 18,  label: "Total Teachers",        icon: Users,         trend: "+2"  },
        { value: 6,   label: "Active Announcements",  icon: Megaphone,     trend: "+1"  },
      ];
    case "teacher":
      return [
        { value: 42,  label: "My Students",     icon: GraduationCap, trend: "stable" },
        { value: 3,   label: "Unread Messages", icon: MessageSquare, trend: "+3"     },
        { value: 5,   label: "Posts This Week", icon: Megaphone,     trend: "+5"     },
      ];
    case "parent":
      return [
        { value: 2,   label: "My Children",        icon: Baby,        trend: "stable" },
        { value: 4,   label: "New Announcements",   icon: Megaphone,   trend: "+4"    },
        { value: 1,   label: "Unread Messages",     icon: MessageSquare, trend: "+1"  },
      ];
    case "student":
      return [
        { value: 3,   label: "New Announcements", icon: Megaphone,  trend: "+3" },
        { value: 2,   label: "Homework Due",       icon: BookOpen,   trend: "+2" },
        { value: 4,   label: "Days to Next Event", icon: Calendar,   trend: ""   },
      ];
    default:
      return [];
  }
};

export default function OverviewPage() {
  const { user, setPageTitle } = useDashboard();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loadingAnn, setLoadingAnn] = useState(true);
  const [date, setDate] = useState("");
  const [greeting, setGreeting] = useState("Good morning");

  useEffect(() => {
    setPageTitle("Overview");

    const hour = new Date().getHours();
    if (hour >= 12 && hour < 17)  setGreeting("Good afternoon");
    else if (hour >= 17)           setGreeting("Good evening");
    else                           setGreeting("Good morning");

    setDate(
      new Date().toLocaleDateString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
      })
    );
  }, [setPageTitle]);

  useEffect(() => {
    fetch("/api/announcements/recent")
      .then((r) => r.json())
      .then((j) => { if (j.success) setAnnouncements(j.data); })
      .catch(console.error)
      .finally(() => setLoadingAnn(false));
  }, []);

  const stats = getStats(user.role);

  const cardVariants = {
    hidden: { y: 30, opacity: 0 },
    show: (i: number) => ({
      y: 0, opacity: 1,
      transition: { type: "spring" as const, stiffness: 180, damping: 22, delay: i * 0.08 },
    }),
  };

  return (
    <div className="flex-1 flex flex-col gap-8 max-w-6xl mx-auto w-full">

      {/* ── Hero Greeting ── */}
      <div className="relative">
        {/* Background glow behind heading */}
        <div className="pointer-events-none absolute -top-6 -left-4 h-32 w-64 bg-[#00E324]/5 blur-3xl rounded-full" />

        <SplitReveal className="mb-1">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-heading tracking-tight text-white">
            {greeting},{" "}
            <ScrambleText
              text={user.full_name}
              className="text-[#00E324]"
              delay={300}
              duration={900}
            />
          </h1>
        </SplitReveal>

        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="flex items-center gap-3 mt-3 flex-wrap"
        >
          <p className="text-[#A0A0A0] font-sans text-sm">{date}</p>

          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping-neon absolute inline-flex h-full w-full rounded-full bg-[#00E324] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00E324]" />
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[#00E324] font-heading">
              System Live
            </span>
          </div>
        </motion.div>
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={i}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              animate="show"
              className="group relative overflow-hidden rounded-2xl bg-[#111111] border border-[#1A1A1A] p-5 hover:border-[#00E324]/30 transition-all duration-300 card-neon-top"
              style={{ boxShadow: "0 4px 40px rgba(0,0,0,0.5)" }}
            >
              {/* Corner glow on hover */}
              <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: "radial-gradient(ellipse at 0% 0%, rgba(0,227,36,0.06) 0%, transparent 70%)" }}
              />

              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-4xl font-extrabold font-heading text-white tracking-tight">
                    <CountUp to={stat.value} duration={1600} delay={i * 100} />
                  </p>
                  <p className="text-sm font-medium text-[#A0A0A0] font-sans mt-1 truncate">
                    {stat.label}
                  </p>
                  {stat.trend && stat.trend !== "stable" && (
                    <p className="flex items-center gap-1 text-[11px] font-semibold text-[#00E324] mt-2">
                      <TrendingUp className="h-3 w-3" />
                      {stat.trend} this week
                    </p>
                  )}
                </div>

                <div className="flex-shrink-0 p-3 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] group-hover:bg-[#00E324]/10 group-hover:border-[#00E324]/20 transition-all duration-300">
                  <Icon className="h-5 w-5 text-[#A0A0A0] group-hover:text-[#00E324] transition-colors duration-300" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── Recent Announcements ── */}
      <ClipReveal from="left" delay={0.2} className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Activity className="h-4 w-4 text-[#00E324]" />
            <h3 className="text-base font-bold font-heading text-white tracking-wide">
              Recent Announcements
            </h3>
          </div>
          <button className="group flex items-center gap-1 text-[12px] font-semibold text-[#A0A0A0] hover:text-[#00E324] transition-colors font-heading">
            View All
            <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        <div className="rounded-2xl border border-[#1A1A1A] bg-[#0A0A0A] overflow-hidden">
          {loadingAnn ? (
            <div className="p-5 space-y-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="space-y-2 animate-pulse">
                  <div className="h-3.5 bg-[#1A1A1A] rounded-lg w-2/5" />
                  <div className="h-2.5 bg-[#111111] rounded-lg w-3/4" />
                  <div className="h-2 bg-[#111111] rounded-lg w-1/4" />
                  {n < 3 && <div className="border-b border-[#1A1A1A] pt-2" />}
                </div>
              ))}
            </div>
          ) : announcements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-8 text-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#111111] border border-[#1A1A1A]">
                <Megaphone className="h-5 w-5 text-[#A0A0A0]" />
              </div>
              <p className="text-sm text-[#A0A0A0] font-medium font-sans">No recent announcements</p>
              <p className="text-xs text-[#A0A0A0]/50 font-sans">Check back soon for updates.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#1A1A1A]">
              {announcements.map((ann, idx) => (
                <motion.div
                  key={ann.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + idx * 0.07, duration: 0.35, ease: "easeOut" }}
                  className="p-5 hover:bg-[#111111]/50 transition-colors duration-200 group cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    {/* Priority indicator */}
                    <div className={`mt-1 flex-shrink-0 h-2 w-2 rounded-full ${
                      ann.priority === "emergency" ? "bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.6)]" : "bg-[#00E324] shadow-[0_0_6px_rgba(0,227,36,0.4)]"
                    }`} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h4 className="text-[13px] font-bold text-white font-heading group-hover:text-[#00E324] transition-colors truncate">
                          {ann.title}
                        </h4>
                        {ann.priority === "emergency" && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-red-950/80 text-red-400 border border-red-900/30 uppercase tracking-wider">
                            <Zap className="h-2.5 w-2.5" /> Emergency
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] text-[#A0A0A0] leading-relaxed font-sans line-clamp-2">
                        {ann.body}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-[11px] text-[#A0A0A0]/60">
                        <span className="font-semibold text-[#00E324]/80 font-sans">{ann.authorName}</span>
                        <span>·</span>
                        <span>{new Date(ann.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </ClipReveal>

    </div>
  );
}
