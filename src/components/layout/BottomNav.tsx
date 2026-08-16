"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
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
    { label: "Overview", href: "/dashboard/overview",      icon: LayoutDashboard },
    { label: "Notices",  href: "/dashboard/announcements", icon: Megaphone },
    { label: "Users",    href: "/dashboard/onboarding?tab=Users",           icon: Users },
    { label: "Settings", href: "/dashboard/onboarding?tab=School Settings", icon: Settings },
  ],
  teacher: [
    { label: "Overview", href: "/dashboard/overview",      icon: LayoutDashboard },
    { label: "Notices",  href: "/dashboard/announcements", icon: Megaphone },
    { label: "Messages", href: "/dashboard/messages",      icon: MessageSquare },
    { label: "Homework", href: "/dashboard/homework",      icon: BookOpen },
  ],
  parent: [
    { label: "Feed",     href: "/dashboard/feed",     icon: Rss },
    { label: "Messages", href: "/dashboard/messages", icon: MessageSquare },
    { label: "Homework", href: "/dashboard/homework", icon: BookOpen },
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
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab");
  const { user, unreadCount, outstandingHomework } = useDashboard();
  const links = NAV_BY_ROLE[user.role] ?? [];

  if (links.length === 0) return null;

  return (
    <nav
      aria-label="Primary"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-line bg-canvas/95 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex h-16 w-full items-stretch justify-around px-1">
        {links.map((link) => {
          const [hrefPath, hrefQuery] = link.href.split("?");
          const hrefTab = new URLSearchParams(hrefQuery || "").get("tab");

          const isActive = hrefTab
            ? pathname === hrefPath && currentTab === hrefTab
            : pathname === hrefPath || pathname.startsWith(hrefPath + "/");

          const Icon = link.icon;

          return (
            <li key={link.href} className="flex min-w-0 flex-1">
              <Link
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className="relative flex flex-1 flex-col items-center justify-center gap-1 py-2"
                id={`bottom-nav-${(hrefTab ?? hrefPath.split("/").pop() ?? "").toLowerCase().replace(/\s+/g, "-")}`}
              >
                {isActive && (
                  <motion.span
                    layoutId="bottom-nav-indicator"
                    className="absolute inset-x-3 top-0 h-0.5 rounded-b-full bg-primary"
                    transition={{ type: "spring" as const, stiffness: 400, damping: 34 }}
                  />
                )}

                <span className="relative">
                  <Icon
                    className={`h-[19px] w-[19px] transition-colors duration-150 ${
                      isActive ? "text-primary" : "text-ink-muted"
                    }`}
                  />
                  {link.href === "/dashboard/messages" && unreadCount > 0 && (
                    <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-canvas">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                  {link.href === "/dashboard/homework" && outstandingHomework > 0 && (
                    <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-on-primary ring-2 ring-canvas">
                      {outstandingHomework > 9 ? "9+" : outstandingHomework}
                    </span>
                  )}
                </span>
                <span
                  className={`text-[10px] font-semibold leading-none transition-colors duration-150 ${
                    isActive ? "text-primary" : "text-ink-muted"
                  }`}
                >
                  {link.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
