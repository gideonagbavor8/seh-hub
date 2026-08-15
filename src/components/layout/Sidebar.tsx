"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Megaphone,
  Users,
  FileUp,
  Settings,
  MessageSquare,
  BookOpen,
  GraduationCap,
  Rss,
  Baby,
  Calendar,
  LogOut,
  X,
  GraduationCap as BrandMark,
} from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";

interface SidebarProps {
  isMobileDrawer?: boolean;
}

const NAV_BY_ROLE: Record<string, { label: string; href: string; icon: React.ElementType }[]> = {
  admin: [
    { label: "Overview",      href: "/dashboard/overview",      icon: LayoutDashboard },
    { label: "Announcements", href: "/dashboard/announcements", icon: Megaphone },
    { label: "Users",         href: "/dashboard/onboarding?tab=Users",           icon: Users },
    { label: "Onboarding",    href: "/dashboard/onboarding?tab=Upload",          icon: FileUp },
    { label: "Settings",      href: "/dashboard/onboarding?tab=School Settings", icon: Settings },
  ],
  teacher: [
    { label: "Overview",      href: "/dashboard/overview",      icon: LayoutDashboard },
    { label: "Announcements", href: "/dashboard/announcements", icon: Megaphone },
    { label: "Messages",      href: "/dashboard/messages",      icon: MessageSquare },
    { label: "Homework",      href: "/dashboard/homework",      icon: BookOpen },
    { label: "My Classes",    href: "/dashboard/classes",       icon: GraduationCap },
  ],
  parent: [
    { label: "Feed",          href: "/dashboard/feed",          icon: Rss },
    { label: "Messages",      href: "/dashboard/messages",      icon: MessageSquare },
    { label: "My Children",   href: "/dashboard/children",      icon: Baby },
    { label: "Calendar",      href: "/dashboard/calendar",      icon: Calendar },
  ],
  student: [
    { label: "Feed",          href: "/dashboard/feed",          icon: Rss },
    { label: "Homework",      href: "/dashboard/homework",      icon: BookOpen },
    { label: "Schedule",      href: "/dashboard/schedule",      icon: Calendar },
  ],
};

export default function Sidebar({ isMobileDrawer = false }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab");
  const { user, school, setIsMobileSidebarOpen } = useDashboard();

  const navLinks = NAV_BY_ROLE[user.role] ?? [];
  const initials = user.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const roleLabel = user.role.charAt(0).toUpperCase() + user.role.slice(1);

  const content = (
    <div className="flex h-full w-full flex-col bg-surface border-r border-line">
      {/* ── Brand & School ── */}
      <div className="flex h-20 items-center justify-between gap-3 px-5 border-b border-line flex-shrink-0">
        <Link href="/dashboard" className="flex items-center gap-3 min-w-0">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-on-primary">
            <BrandMark className="h-5 w-5" />
          </span>
          <span className="flex flex-col min-w-0 leading-tight">
            <span className="font-heading text-[17px] font-semibold text-ink truncate">
              SEH Hub
            </span>
            <span className="text-[11px] text-ink-muted truncate">
              {school?.name ?? "Loading…"}
            </span>
          </span>
        </Link>

        {isMobileDrawer && (
          <button
            onClick={() => setIsMobileSidebarOpen(false)}
            className="p-2 -mr-1 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-2 transition-colors"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
          Menu
        </p>
        <ul className="space-y-0.5">
          {navLinks.map((link) => {
            const [hrefPath, hrefQuery] = link.href.split("?");
            const params = new URLSearchParams(hrefQuery || "");
            const hrefTab = params.get("tab");

            let isActive = false;
            if (hrefTab) {
              isActive = pathname === hrefPath && currentTab === hrefTab;
            } else if (hrefPath === "/dashboard/onboarding") {
              isActive = pathname === hrefPath && (!currentTab || currentTab === "Upload");
            } else {
              isActive = pathname === hrefPath || pathname.startsWith(hrefPath + "/");
            }
            const Icon = link.icon;

            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => isMobileDrawer && setIsMobileSidebarOpen(false)}
                  aria-current={isActive ? "page" : undefined}
                  className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors duration-150 ${
                    isActive
                      ? "bg-primary-soft text-primary"
                      : "text-ink-soft hover:bg-surface-2 hover:text-ink"
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="sidebar-active"
                      className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-full bg-primary"
                      transition={{ type: "spring" as const, stiffness: 400, damping: 34 }}
                    />
                  )}
                  <Icon className="h-[18px] w-[18px] flex-shrink-0" />
                  <span className="truncate">{link.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ── User & Sign Out ── */}
      <div className="flex-shrink-0 border-t border-line p-3">
        <div className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2.5 mb-2">
          <div className="relative h-9 w-9 flex-shrink-0 rounded-full overflow-hidden bg-primary-soft ring-1 ring-line">
            {user.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center font-heading text-xs font-semibold text-primary">
                {initials}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="truncate text-[13px] font-semibold text-ink leading-tight">
              {user.full_name}
            </p>
            <p className="text-[11px] text-ink-muted mt-0.5">{roleLabel}</p>
          </div>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-ink-soft hover:bg-danger-soft hover:text-danger transition-colors duration-150"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );

  if (isMobileDrawer) return content;

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:h-screen lg:fixed lg:top-0 lg:left-0 z-30">
      {content}
    </aside>
  );
}
