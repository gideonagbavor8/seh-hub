"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
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

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  type: "announcement" | "message" | "emergency" | "homework";
  is_read: boolean;
  meta: Record<string, unknown> | null;
  created_at: string;
}

interface DashboardContextType {
  user: DashboardUser;
  school: SchoolInfo | null;
  unreadCount: number;
  notifications: NotificationItem[];
  unreadNotifications: number;
  outstandingHomework: number;
  refreshHomeworkCount: () => void;
  markNotificationsRead: () => Promise<void>;
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
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);
  const [outstandingHomework, setOutstandingHomework] = useState<number>(0);
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

  // Notifications are a separate stream from direct messages. The bell
  // previously showed the message count, which was simply the wrong number.
  const refreshNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      const json = await res.json();
      if (json.success) {
        setNotifications(json.data.notifications ?? []);
        setUnreadNotifications(json.data.unreadCount ?? 0);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  }, []);

  useEffect(() => {
    refreshNotifications();
    const interval = setInterval(refreshNotifications, 60000);
    return () => clearInterval(interval);
  }, [refreshNotifications]);

  // Outstanding homework, for the badge on the Homework nav item. Only
  // students and parents have an actionable number; the API returns 0 for
  // staff, so there is no badge to mislead a teacher.
  const refreshHomeworkCount = useCallback(async () => {
    if (user.role !== "student" && user.role !== "parent") return;
    try {
      const res = await fetch("/api/homework?count=true");
      const json = await res.json();
      if (json.success) setOutstandingHomework(json.data.outstanding ?? 0);
    } catch (err) {
      console.error("Failed to fetch homework count:", err);
    }
  }, [user.role]);

  useEffect(() => {
    refreshHomeworkCount();
    const interval = setInterval(refreshHomeworkCount, 60000);
    return () => clearInterval(interval);
  }, [refreshHomeworkCount]);

  const markNotificationsRead = useCallback(async () => {
    if (unreadNotifications === 0) return;

    // Optimistic: the badge clears the moment the panel opens.
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadNotifications(0);

    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
    } catch (err) {
      console.error("Failed to mark notifications read:", err);
      refreshNotifications();
    }
  }, [unreadNotifications, refreshNotifications]);

  return (
    <DashboardContext.Provider
      value={{
        user,
        school,
        unreadCount,
        notifications,
        unreadNotifications,
        markNotificationsRead,
        outstandingHomework,
        refreshHomeworkCount,
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
