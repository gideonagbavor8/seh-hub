// src/types/index.ts
// Shared TypeScript types and interfaces for SEH Hub
// Roles, domain entities, and API response shapes

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

export type UserRole = "admin" | "teacher" | "parent" | "student";

// ---------------------------------------------------------------------------
// User / Auth
// ---------------------------------------------------------------------------

export interface BaseUser {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminUser extends BaseUser {
  role: "admin";
}

export interface TeacherUser extends BaseUser {
  role: "teacher";
  staffId: string;
  subjectIds: string[];
}

export interface ParentUser extends BaseUser {
  role: "parent";
  studentIds: string[]; // IDs of linked student records
}

export interface StudentUser extends BaseUser {
  role: "student";
  studentId: string;   // School-assigned student ID
  classId: string;
  parentIds: string[];
}

// ---------------------------------------------------------------------------
// Academic structures
// ---------------------------------------------------------------------------

export interface Class {
  id: string;
  name: string;           // e.g. "Year 7A"
  gradeLevel: string;     // e.g. "Year 7"
  teacherId: string;      // Class teacher
  academicYear: string;   // e.g. "2024/2025"
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  classIds: string[];
}

// ---------------------------------------------------------------------------
// Communication
// ---------------------------------------------------------------------------

export type MessageChannel = "sms" | "in-app";

export type MessageStatus = "pending" | "sent" | "failed" | "delivered";

export interface Message {
  id: string;
  senderId: string;
  recipientIds: string[];
  channel: MessageChannel;
  body: string;
  status: MessageStatus;
  sentAt: Date | null;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Cohort onboarding (CSV / Excel import)
// ---------------------------------------------------------------------------

export interface RawStudentRow {
  studentId: string;
  firstName: string;
  lastName: string;
  gradeLevel: string;
  className: string;
  parentName: string;
  parentPhone: string;
  parentEmail?: string;
}

export interface OnboardingResult {
  imported: number;
  skipped: number;
  errors: Array<{ row: number; reason: string }>;
}

// ---------------------------------------------------------------------------
// API responses
// ---------------------------------------------------------------------------

export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
  code?: string;
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

// ---------------------------------------------------------------------------
// NextAuth types augmentation
// ---------------------------------------------------------------------------
import type { DefaultSession } from "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      school_id: string;
      school_slug: string;
      full_name: string;
      avatar_url: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: UserRole;
    school_id: string;
    school_slug: string;
    full_name: string;
    avatar_url: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    school_id: string;
    school_slug: string;
    full_name: string;
    avatar_url: string | null;
  }
}
