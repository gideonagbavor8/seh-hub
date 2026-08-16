"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, Bell, Search, X, AlertTriangle, Megaphone, Mail, BookOpen } from "lucide-react";
import { useDashboard, type NotificationItem } from "@/context/DashboardContext";
import ThemeToggle from "./ThemeToggle";

const NOTIFICATION_ICON: Record<NotificationItem["type"], React.ElementType> = {
  announcement: Megaphone,
  message: Mail,
  emergency: AlertTriangle,
  homework: BookOpen,
};

/** Where a notification takes you when clicked. */
function destinationFor(n: NotificationItem) {
  if (n.type === "message") {
    const threadId = (n.meta as { thread_id?: string } | null)?.thread_id;
    return threadId
      ? "/dashboard/messages?thread=" + encodeURIComponent(threadId)
      : "/dashboard/messages";
  }
  if (n.type === "homework") return "/dashboard/homework";
  return "/dashboard/announcements";
}

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return mins + "m ago";
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + "h ago";
  return Math.floor(hrs / 24) + "d ago";
}

export default function Header() {
  const {
    user,
    notifications,
    unreadNotifications,
    markNotificationsRead,
    pageTitle,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
  } = useDashboard();

  const [searchOpen, setSearchOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  // Close the panel on an outside click or Escape.
  useEffect(() => {
    if (!bellOpen) return;

    const onClick = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setBellOpen(false);
    };

    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [bellOpen]);

  function toggleBell() {
    const opening = !bellOpen;
    setBellOpen(opening);
    if (opening) markNotificationsRead();
  }

  const initials = user.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const roleLabel = user.role.charAt(0).toUpperCase() + user.role.slice(1);
  const bellBadge = unreadNotifications > 9 ? "9+" : String(unreadNotifications);

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full flex-shrink-0 items-center justify-between gap-3 border-b border-line bg-canvas/85 px-4 backdrop-blur-md sm:px-6 lg:px-10">
      {/* ── Left: Hamburger + Page Title ── */}
      <div className="flex min-w-0 items-center gap-2">
        <button
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          className="lg:hidden -ml-1 rounded-xl p-2 text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink"
          aria-label="Toggle navigation"
          aria-expanded={isMobileSidebarOpen}
          id="sidebar-toggle"
        >
          <Menu className="h-5 w-5" />
        </button>

        <h1 className="truncate font-heading text-[19px] font-semibold text-ink">
          {pageTitle}
        </h1>
      </div>

      {/* ── Right: Search + Alerts + Identity ── */}
      <div className="flex items-center gap-1 sm:gap-2">
        <AnimatePresence mode="wait" initial={false}>
          {searchOpen ? (
            <motion.div
              key="search-input"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 220, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="relative overflow-hidden"
            >
              <input
                autoFocus
                type="search"
                placeholder="Search…"
                aria-label="Search"
                className="input h-9 py-0 pr-9 text-sm"
                id="header-search"
              />
              <button
                onClick={() => setSearchOpen(false)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted transition-colors hover:text-ink"
                aria-label="Close search"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          ) : (
            <button
              key="search-icon"
              onClick={() => setSearchOpen(true)}
              className="hidden rounded-xl p-2 text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink sm:flex"
              aria-label="Open search"
              id="header-search-btn"
            >
              <Search className="h-5 w-5" />
            </button>
          )}
        </AnimatePresence>

        <ThemeToggle />

        {/* Notifications */}
        <div className="relative" ref={bellRef}>
          <button
            onClick={toggleBell}
            className="relative rounded-xl p-2 text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink"
            id="notification-bell"
            aria-label={
              unreadNotifications > 0
                ? "Notifications, " + unreadNotifications + " unread"
                : "Notifications"
            }
            aria-expanded={bellOpen}
            aria-haspopup="true"
          >
            <Bell className="h-5 w-5" />
            {unreadNotifications > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-canvas">
                {bellBadge}
              </span>
            )}
          </button>

          <AnimatePresence>
            {bellOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                className="card fixed inset-x-3 top-[4.5rem] z-50 max-h-[calc(100vh-6rem)] overflow-hidden p-0 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:max-h-none sm:w-80"
                role="menu"
              >
                <div className="flex items-center justify-between border-b border-line px-4 py-3">
                  <p className="font-heading text-sm font-semibold text-ink">Notifications</p>
                  <span className="text-xs text-ink-muted">{notifications.length}</span>
                </div>

                {notifications.length === 0 ? (
                  <div className="px-4 py-10 text-center">
                    <p className="text-sm text-ink-muted">Nothing here yet.</p>
                  </div>
                ) : (
                  <ul className="max-h-[60vh] divide-y divide-line overflow-y-auto sm:max-h-80">
                    {notifications.map((n) => {
                      const Icon = NOTIFICATION_ICON[n.type] ?? Megaphone;
                      return (
                        <li key={n.id}>
                          <Link
                            href={destinationFor(n)}
                            onClick={() => setBellOpen(false)}
                            className="flex gap-3 px-4 py-3 transition-colors hover:bg-surface-2"
                          >
                            <span
                              className={
                                "mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg " +
                                (n.type === "emergency"
                                  ? "bg-danger-soft text-danger"
                                  : "bg-primary-soft text-primary")
                              }
                            >
                              <Icon className="h-3.5 w-3.5" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-ink">{n.title}</p>
                              <p className="line-clamp-2 text-xs text-ink-soft">{n.body}</p>
                              <p className="mt-1 text-[11px] text-ink-muted">{timeAgo(n.created_at)}</p>
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mx-1 hidden h-6 w-px bg-line sm:block" />

        {/* Identity */}
        <div className="flex items-center gap-2.5">
          <span className="badge-neutral hidden md:inline-flex">{roleLabel}</span>

          <div
            className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-full bg-primary-soft ring-1 ring-line"
            id="header-avatar"
          >
            {user.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatar_url}
                alt={user.full_name}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center font-heading text-xs font-semibold text-primary">
                {initials}
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
