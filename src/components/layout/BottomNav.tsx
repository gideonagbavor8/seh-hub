"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Megaphone,
  Users,
  Settings,
  MessageSquare,
  BookOpen,
  Rss,
  Baby,
  Calendar,
} from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";

const NAV_BY_ROLE: Record<string, { label: string; href: string; icon: React.ElementType }[]> = {
  admin: [
    { label: "Overview", href: "/dashboard/overview", icon: LayoutDashboard },
    { label: "Alerts",   href: "/dashboard/announcements", icon: Megaphone },
    { label: "Users",    href: "/dashboard/users",    icon: Users },
    { label: "Settings", href: "/dashboard/settings", icon: Settings },
  ],
  teacher: [
    { label: "Overview", href: "/dashboard/overview",      icon: LayoutDashboard },
    { label: "Alerts",   href: "/dashboard/announcements", icon: Megaphone },
    { label: "Messages", href: "/dashboard/messages",      icon: MessageSquare },
    { label: "Homework", href: "/dashboard/homework",      icon: BookOpen },
  ],
  parent: [
    { label: "Feed",     href: "/dashboard/feed",     icon: Rss },
    { label: "Messages", href: "/dashboard/messages", icon: MessageSquare },
    { label: "Children", href: "/dashboard/children", icon: Baby },
    { label: "Calendar", href: "/dashboard/calendar", icon: Calendar },
  ],
  student: [
    { label: "Feed",     href: "/dashboard/feed",     icon: Rss },
    { label: "Homework", href: "/dashboard/homework", icon: BookOpen },
    { label: "Schedule", href: "/dashboard/schedule", icon: Calendar },
  ],
};

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useDashboard();
  const links = NAV_BY_ROLE[user.role] ?? [];

  if (links.length === 0) return null;

  return (
    <div
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#000000]/90 backdrop-blur-2xl border-t border-[#1A1A1A]"
      style={{ boxShadow: "0 -1px 0 rgba(0,227,36,0.06)" }}
    >
      {/* Neon top edge */}
      <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-[#00E324]/30 to-transparent" />

      <div className="flex h-[60px] w-full items-stretch justify-around px-1">
        {links.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
          const Icon = link.icon;

          return (
            <Link
              key={link.href}
              href={link.href}
              className="relative flex flex-col items-center justify-center flex-1 py-1 min-w-0 focus:outline-none"
              id={`bottom-nav-${link.href.split("/").pop()}`}
            >
              {/* Floating pill indicator */}
              <AnimatePresence>
                {isActive && (
                  <motion.span
                    layoutId="bottom-nav-pill"
                    className="absolute top-0 inset-x-2 h-[2px] rounded-b-full bg-[#00E324] shadow-[0_0_8px_#00E324]"
                    transition={{ type: "spring" as const, stiffness: 380, damping: 30 }}
                  />
                )}
              </AnimatePresence>

              {/* Icon with scale tap */}
              <motion.div
                whileTap={{ scale: 0.85 }}
                className="flex flex-col items-center gap-1"
              >
                <div
                  className={`flex items-center justify-center h-8 w-8 rounded-xl transition-all duration-200 ${
                    isActive
                      ? "bg-[#00E324]/10 shadow-[0_0_12px_rgba(0,227,36,0.2)]"
                      : ""
                  }`}
                >
                  <Icon
                    className={`h-[18px] w-[18px] transition-colors duration-200 ${
                      isActive ? "text-[#00E324]" : "text-[#A0A0A0]"
                    }`}
                  />
                </div>
                <span
                  className={`text-[10px] font-semibold font-heading leading-none transition-colors duration-200 ${
                    isActive ? "text-[#00E324]" : "text-[#A0A0A0]"
                  }`}
                >
                  {link.label}
                </span>
              </motion.div>
            </Link>
          );
        })}
      </div>

      {/* iOS safe area spacer */}
      <div className="h-safe-bottom" />
    </div>
  );
}
