"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
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
  Zap,
} from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";

interface SidebarProps {
  isMobileDrawer?: boolean;
}

const NAV_BY_ROLE: Record<string, { label: string; href: string; icon: React.ElementType }[]> = {
  admin: [
    { label: "Overview",      href: "/dashboard/overview",      icon: LayoutDashboard },
    { label: "Announcements", href: "/dashboard/announcements", icon: Megaphone },
    { label: "Users",         href: "/dashboard/users",         icon: Users },
    { label: "Onboarding",    href: "/dashboard/onboarding",    icon: FileUp },
    { label: "Settings",      href: "/dashboard/settings",      icon: Settings },
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

const sidebarVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};

const navItemVariants = {
  hidden: { x: -20, opacity: 0 },
  show:   { x: 0,   opacity: 1, transition: { type: "spring" as const, stiffness: 200, damping: 24 } },
};

export default function Sidebar({ isMobileDrawer = false }: SidebarProps) {
  const pathname = usePathname();
  const { user, school, setIsMobileSidebarOpen } = useDashboard();

  const navLinks = NAV_BY_ROLE[user.role] ?? [];
  const initials = user.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const roleLabel = user.role.charAt(0).toUpperCase() + user.role.slice(1);

  const content = (
    <div className="flex h-full w-full flex-col bg-[#0A0A0A]/95 border-r border-[#1A1A1A] backdrop-blur-xl text-white relative overflow-hidden">
      {/* Sidebar inner glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "linear-gradient(135deg, rgba(0,227,36,0.03) 0%, transparent 60%)",
        }}
      />

      {/* ── Logo & School ── */}
      <div className="relative flex h-16 items-center justify-between px-5 border-b border-[#1A1A1A] flex-shrink-0">
        <div className="flex items-center gap-2.5">
          {/* Logo mark */}
          <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-[#00E324] shadow-[0_0_16px_rgba(0,227,36,0.5)]">
            <Zap className="h-4 w-4 text-black fill-black" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-[15px] font-bold font-heading tracking-wide text-white">
              SEH <span className="text-[#00E324]">Hub</span>
            </span>
            <span className="text-[10px] text-[#A0A0A0] font-sans tracking-wider truncate max-w-[150px] mt-0.5">
              {school?.name ?? "Loading…"}
            </span>
          </div>
        </div>

        {isMobileDrawer && (
          <button
            onClick={() => setIsMobileSidebarOpen(false)}
            className="p-1.5 rounded-lg text-[#A0A0A0] hover:text-white hover:bg-[#111111] transition-colors focus:outline-none"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <p className="px-3 mb-3 text-[10px] font-semibold uppercase tracking-widest text-[#A0A0A0]/50 font-heading">
          Navigation
        </p>
        <motion.ul
          variants={sidebarVariants}
          initial="hidden"
          animate="show"
          className="space-y-1"
        >
          {navLinks.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
            const Icon = link.icon;

            return (
              <motion.li key={link.href} variants={navItemVariants}>
                <Link
                  href={link.href}
                  onClick={() => isMobileDrawer && setIsMobileSidebarOpen(false)}
                  className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium font-heading transition-all duration-200 ${
                    isActive
                      ? "text-black bg-[#00E324]"
                      : "text-[#A0A0A0] hover:text-white hover:bg-[#111111]"
                  }`}
                >
                  {/* Active glow pill */}
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active-pill"
                      className="absolute inset-0 rounded-xl bg-[#00E324]"
                      style={{ zIndex: -1 }}
                      transition={{ type: "spring" as const, stiffness: 350, damping: 30 }}
                    />
                  )}

                  <Icon
                    className={`h-[18px] w-[18px] flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                      isActive ? "text-black" : ""
                    }`}
                  />
                  <span className="truncate">{link.label}</span>

                  {/* Hover right indicator */}
                  {!isActive && (
                    <span className="absolute right-2 h-1.5 w-1.5 rounded-full bg-[#00E324] opacity-0 group-hover:opacity-60 transition-opacity duration-300" />
                  )}
                </Link>
              </motion.li>
            );
          })}
        </motion.ul>
      </nav>

      {/* ── User Profile & Sign Out ── */}
      <div className="flex-shrink-0 p-3 border-t border-[#1A1A1A]">
        {/* User info card */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-[#111111] border border-[#1A1A1A] mb-2">
          {/* Avatar */}
          <div className="relative h-9 w-9 flex-shrink-0 rounded-full overflow-hidden bg-[#1A1A1A] ring-2 ring-[#00E324]/30">
            {user.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatar_url} alt={user.full_name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs font-bold text-[#00E324] font-heading">
                {initials}
              </div>
            )}
            {/* Online dot */}
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-[#00E324] border-2 border-[#0A0A0A] shadow-[0_0_6px_#00E324]" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold truncate text-white leading-tight font-heading">
              {user.full_name}
            </p>
            <p className="text-[11px] text-[#00E324] font-medium mt-0.5 font-sans">
              {roleLabel}
            </p>
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="group flex w-full items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-[#A0A0A0] hover:text-red-400 hover:bg-red-950/20 border border-[#1A1A1A] hover:border-red-900/30 transition-all duration-300 font-heading"
        >
          <LogOut className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  if (isMobileDrawer) return content;

  return (
    <aside
      className="hidden lg:flex lg:flex-col lg:w-64 lg:h-screen lg:fixed lg:top-0 lg:left-0 z-30"
      style={{ boxShadow: "1px 0 30px rgba(0,227,36,0.06)" }}
    >
      {content}
    </aside>
  );
}
