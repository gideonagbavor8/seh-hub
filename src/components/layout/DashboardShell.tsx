"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useDashboard } from "@/context/DashboardContext";
import Sidebar from "./Sidebar";
import Header from "./Header";
import BottomNav from "./BottomNav";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const { isMobileSidebarOpen, setIsMobileSidebarOpen } = useDashboard();

  return (
    <div className="min-h-screen bg-canvas text-ink flex relative">
      {/* ── Desktop Sidebar ── */}
      <Sidebar />

      {/* ── Mobile Sidebar Drawer ── */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setIsMobileSidebarOpen(false)}
              className="lg:hidden fixed inset-0 z-40 bg-ink/25"
            />

            <motion.div
              initial={reduceMotion ? { opacity: 0 } : { x: "-100%" }}
              animate={reduceMotion ? { opacity: 1 } : { x: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { x: "-100%" }}
              transition={{ type: "spring" as const, bounce: 0, duration: 0.3 }}
              className="lg:hidden fixed top-0 bottom-0 left-0 w-72 z-50"
              style={{ boxShadow: "var(--shadow-lift)" }}
            >
              <Sidebar isMobileDrawer />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Main Content Area ── */}
      <div className="relative flex-1 flex flex-col min-w-0 lg:pl-72 min-h-screen pb-20 lg:pb-0">
        <Header />

        <main className="flex-1 flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="flex-1 flex flex-col px-4 py-6 sm:px-6 sm:py-8 lg:px-10"
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
