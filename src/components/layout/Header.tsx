"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, Bell, Search, X } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";

export default function Header() {
  const {
    user,
    unreadCount,
    pageTitle,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
  } = useDashboard();

  const [searchOpen, setSearchOpen] = useState(false);
  const [bellHovered, setBellHovered] = useState(false);

  const initials = user.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const roleLabel = user.role.charAt(0).toUpperCase() + user.role.slice(1);

  return (
    <motion.header
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.33, 1, 0.68, 1] }}
      className="sticky top-0 z-40 flex h-16 w-full items-center justify-between px-4 sm:px-6 bg-[#000000]/80 backdrop-blur-xl border-b border-[#1A1A1A] text-white flex-shrink-0"
      style={{ boxShadow: "0 1px 0 rgba(0,227,36,0.05)" }}
    >
      {/* ── Left: Hamburger + Page Title ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          className="lg:hidden p-2 rounded-xl text-[#A0A0A0] hover:text-white hover:bg-[#111111] transition-all focus:outline-none"
          aria-label="Toggle menu"
          id="sidebar-toggle"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Animated page title */}
        <AnimatePresence mode="wait">
          <motion.div
            key={pageTitle}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="flex items-center gap-2"
          >
            {/* Decorative neon accent */}
            <span className="hidden sm:block h-4 w-[2px] rounded-full bg-[#00E324] shadow-[0_0_8px_#00E324]" />
            <h2 className="text-[17px] font-bold font-heading tracking-wide text-white">
              {pageTitle}
            </h2>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Right: Search + Bell + Avatar ── */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Search Toggle */}
        <AnimatePresence>
          {searchOpen ? (
            <motion.div
              key="search-input"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 200, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="relative overflow-hidden"
            >
              <input
                autoFocus
                type="text"
                placeholder="Search…"
                className="w-full h-9 px-3 pr-8 bg-[#111111] border border-[#1A1A1A] focus:border-[#00E324] rounded-xl text-sm text-white placeholder-[#A0A0A0] outline-none transition-colors font-sans"
                id="header-search"
              />
              <button
                onClick={() => setSearchOpen(false)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#A0A0A0] hover:text-white transition-colors"
                aria-label="Close search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          ) : (
            <motion.button
              key="search-icon"
              onClick={() => setSearchOpen(true)}
              className="hidden sm:flex p-2 rounded-xl text-[#A0A0A0] hover:text-white hover:bg-[#111111] transition-all focus:outline-none"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              aria-label="Open search"
              id="header-search-btn"
            >
              <Search className="h-5 w-5" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Notification Bell */}
        <motion.div
          className="relative cursor-pointer"
          onHoverStart={() => setBellHovered(true)}
          onHoverEnd={() => setBellHovered(false)}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          id="notification-bell"
          role="button"
          aria-label="Notifications"
        >
          <div className="p-2 rounded-xl text-[#A0A0A0] hover:text-white hover:bg-[#111111] transition-all">
            <Bell className="h-5 w-5" />
          </div>
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#00E324] text-[9px] font-bold text-black ring-2 ring-black font-heading"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>

          {/* Pulse ring */}
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-[#00E324] animate-ping-neon pointer-events-none" />
          )}
        </motion.div>

        {/* Divider */}
        <div className="hidden sm:block h-7 w-px bg-[#1A1A1A]" />

        {/* Role pill + Avatar */}
        <div className="flex items-center gap-2.5">
          <span className="hidden md:inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#00E324]/10 text-[#00E324] border border-[#00E324]/20 uppercase tracking-wider font-heading">
            {roleLabel}
          </span>

          {/* Avatar */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="relative h-8 w-8 rounded-full ring-2 ring-[#00E324]/40 ring-offset-2 ring-offset-black overflow-hidden bg-[#1A1A1A] cursor-pointer flex-shrink-0"
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
              <div className="flex h-full w-full items-center justify-center text-[11px] font-bold text-[#00E324] font-heading">
                {initials}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </motion.header>
  );
}
