"use client";

import React, { useRef } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useDashboard } from "@/context/DashboardContext";
import Sidebar from "./Sidebar";
import Header from "./Header";
import BottomNav from "./BottomNav";

/** Aurora blob config */
const AURORA_BLOBS = [
  {
    size: "700px",
    top: "-20%",
    left: "-10%",
    color: "radial-gradient(ellipse, rgba(0,227,36,0.12) 0%, transparent 70%)",
    delay: "0s",
    duration: "22s",
  },
  {
    size: "500px",
    top: "50%",
    right: "-15%",
    color: "radial-gradient(ellipse, rgba(0,184,30,0.08) 0%, transparent 70%)",
    delay: "-8s",
    duration: "28s",
  },
  {
    size: "400px",
    bottom: "-10%",
    left: "30%",
    color: "radial-gradient(ellipse, rgba(0,227,36,0.06) 0%, transparent 70%)",
    delay: "-15s",
    duration: "20s",
  },
];

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isMobileSidebarOpen, setIsMobileSidebarOpen } = useDashboard();

  return (
    <div className="min-h-screen bg-[#000000] text-white flex relative overflow-hidden">
      {/* ── Aurora Background Layers ── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {AURORA_BLOBS.map((blob, i) => (
          <div
            key={i}
            className="aurora-layer absolute"
            style={{
              width: blob.size,
              height: blob.size,
              top: blob.top,
              left: blob.left,
              right: (blob as { right?: string }).right,
              bottom: (blob as { bottom?: string }).bottom,
              background: blob.color,
              animationDelay: blob.delay,
              animationDuration: blob.duration,
            }}
          />
        ))}
      </div>

      {/* ── Noise Grain Overlay ── */}
      <div className="noise-overlay" aria-hidden="true" />

      {/* ── Scanlines ── */}
      <div className="scanlines" aria-hidden="true" />

      {/* ── Desktop Sidebar ── */}
      <Sidebar />

      {/* ── Mobile Sidebar Drawer ── */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsMobileSidebarOpen(false)}
              className="lg:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
            />

            {/* Slide-in panel */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring" as const, bounce: 0, duration: 0.35 }}
              className="lg:hidden fixed top-0 bottom-0 left-0 w-64 z-50 shadow-2xl"
            >
              <Sidebar isMobileDrawer />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Main Content Area ── */}
      <div className="relative z-10 flex-1 flex flex-col min-w-0 lg:pl-64 min-h-screen pb-16 lg:pb-0">
        {/* Sticky Top Header */}
        <Header />

        {/* Page Content with Curtain Wipe */}
        <main className="flex-1 flex flex-col relative overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, clipPath: "inset(0 100% 0 0)" }}
              animate={{ opacity: 1, clipPath: "inset(0 0% 0 0)" }}
              exit={{ opacity: 0, clipPath: "inset(0 0 0 100%)" }}
              transition={{ duration: 0.5, ease: [0.76, 0, 0.24, 1] }}
              className="flex-1 flex flex-col p-4 sm:p-6 md:p-8"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* ── Mobile Bottom Navigation ── */}
      <BottomNav />
    </div>
  );
}
