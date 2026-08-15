"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, Bell, Search, X, MessageCircle } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
  const {
    user,
    unreadCount,
    pageTitle,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
  } = useDashboard();

  const [searchOpen, setSearchOpen] = useState(false);

  const initials = user.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const roleLabel = user.role.charAt(0).toUpperCase() + user.role.slice(1);
  const badgeLabel = unreadCount > 9 ? "9+" : String(unreadCount);

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
        <button
          className="relative rounded-xl p-2 text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink"
          id="notification-bell"
          aria-label={
            unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"
          }
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-canvas">
              {badgeLabel}
            </span>
          )}
        </button>

        {/* Messages */}
        <button
          className="relative rounded-xl p-2 text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink"
          id="message-badge"
          aria-label={
            unreadCount > 0 ? `Messages, ${unreadCount} unread` : "Messages"
          }
        >
          <MessageCircle className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-canvas">
              {badgeLabel}
            </span>
          )}
        </button>

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
