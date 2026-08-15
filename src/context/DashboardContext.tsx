"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { UserRole } from "@/types";
import { applySchoolAccent, getCurrentTheme, THEME_EVENT } from "@/lib/theme";

export interface DashboardUser {
  id: string;
  name: string;
  email: string | null;
  role: UserRole;
  school_id: string;
  school_slug: string;
  full_name: string;
  avatar_url: string | null;
}

export interface SchoolInfo {
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
}

interface DashboardContextType {
  user: DashboardUser;
  school: SchoolInfo | null;
  unreadCount: number;
  pageTitle: string;
  setPageTitle: (title: string) => void;
  isLoadingSchool: boolean;
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: (isOpen: boolean) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser: DashboardUser;
}) {
  const [user] = useState<DashboardUser>(initialUser);
  const [school, setSchool] = useState<SchoolInfo | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [pageTitle, setPageTitle] = useState<string>("Dashboard");
  const [isLoadingSchool, setIsLoadingSchool] = useState<boolean>(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Fetch school info once on mount
  useEffect(() => {
    async function fetchSchoolInfo() {
      try {
        const res = await fetch("/api/school/info");
        const json = await res.json();
        if (json.success) {
          setSchool({
            name: json.data.name,
            slug: json.data.slug,
            logo_url: json.data.logo_url,
            primary_color: json.data.primary_color || "",
            secondary_color: json.data.secondary_color || "#000000",
          });
        }
      } catch (err) {
        console.error("Failed to fetch school info:", err);
      } finally {
        setIsLoadingSchool(false);
      }
    }

    fetchSchoolInfo();
  }, []);

  // Paint the school's saved accent colour onto the design system.
  // Overriding --primary is enough: hover, soft and ring shades derive from it
  // in CSS. Re-runs on theme change so the contrast correction is recomputed
  // against whichever surface is actually behind the text.
  useEffect(() => {
    const accent = school?.primary_color;
    if (!accent) return;

    applySchoolAccent(accent, getCurrentTheme());

    const onThemeChange = () => applySchoolAccent(accent, getCurrentTheme());
    window.addEventListener(THEME_EVENT, onThemeChange);
    return () => window.removeEventListener(THEME_EVENT, onThemeChange);
  }, [school?.primary_color]);

  // Fetch / update unread message count every 60 seconds
  useEffect(() => {
    async function refreshUnread() {
      try {
        const res = await fetch("/api/messages?count=true");
        const json = await res.json();
        if (json.success) {
          setUnreadCount(json.data.totalUnread ?? 0);
        }
      } catch (err) {
        console.error("Failed to fetch unread count:", err);
      }
    }

    refreshUnread();
    const interval = setInterval(refreshUnread, 60000);

    return () => clearInterval(interval);
  }, []);

  return (
    <DashboardContext.Provider
      value={{
        user,
        school,
        unreadCount,
        pageTitle,
        setPageTitle,
        isLoadingSchool,
        isMobileSidebarOpen,
        setIsMobileSidebarOpen,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
}
