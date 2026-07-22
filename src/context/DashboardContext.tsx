"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { UserRole } from "@/types";

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
            primary_color: json.data.primary_color || "#00E324",
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

  // Fetch / update unread count every 60 seconds
  useEffect(() => {
    // For now, let's simulate unread notifications count or fetch it if an API existed
    // Since notifications count is requested to refresh every 60s, let's fetch or generate a count.
    function updateUnreadCount() {
      // Simulate random notification update for demo, or set static default
      setUnreadCount((prev) => {
        const next = Math.floor(Math.random() * 5) + 1; // 1 to 5
        return next;
      });
    }

    updateUnreadCount();
    const interval = setInterval(updateUnreadCount, 60000);

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
