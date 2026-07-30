// src/app/api/announcements/route.ts
// GET: paginated, role-filtered announcements
// POST: create announcement, sign (if admin), route notifications

import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  announcements,
  users,
  cohorts,
  teacherCohorts,
  studentCohorts,
  parentStudentLinks,
} from "@/db/schema";
import { setDbSession } from "@/lib/db-session";
import { signAnnouncement, getSchoolPublicKey } from "@/lib/crypto";
import { routeAnnouncement } from "@/lib/notification-router";
import { desc, eq, and, inArray, isNull, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id: userId, school_id: schoolId, role } = session.user;
  const searchParams = request.nextUrl.searchParams;
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  try {
    await setDbSession(db, userId, schoolId);

    // RLS handles role-based visibility, so we just query by school
    const results = await db
      .select({
        id: announcements.id,
        title: announcements.title,
        body: announcements.body,
        priority: announcements.priority,
        signature: announcements.signature,
        mediaUrl: announcements.mediaUrl,
        cohortId: announcements.cohortId,
        createdAt: announcements.createdAt,
        authorName: users.fullName,
        authorRole: users.role,
        authorAvatar: users.avatarUrl,
      })
      .from(announcements)
      .innerJoin(users, eq(announcements.authorId, users.id))
      .where(eq(announcements.schoolId, schoolId))
      .orderBy(desc(announcements.createdAt))
      .limit(limit)
      .offset(offset);

    // Fetch cohort names for the announcement cohort IDs
    const cohortIds = results
      .map((r) => r.cohortId)
      .filter((id): id is string => id !== null);

    let cohortMap: Record<string, string> = {};
    if (cohortIds.length > 0) {
      const cohortRows = await db
        .select({ id: cohorts.id, name: cohorts.name })
        .from(cohorts)
        .where(inArray(cohorts.id, cohortIds));
      cohortMap = Object.fromEntries(cohortRows.map((c) => [c.id, c.name]));
    }

    // Get school public key for client-side verification
    let publicKey = "";
    try {
      publicKey = getSchoolPublicKey();
    } catch {
      // Key not configured — signature verification will be skipped on client
    }

    const data = results.map((r) => ({
      id: r.id,
      title: r.title,
      body: r.body,
      priority: r.priority,
      signature: r.signature,
      mediaUrl: r.mediaUrl,
      createdAt: r.createdAt?.toISOString() ?? "",
      authorName: r.authorName,
      authorRole: r.authorRole,
      authorAvatar: r.authorAvatar,
      cohortName: r.cohortId ? (cohortMap[r.cohortId] || "Unknown Cohort") : "School-Wide",
    }));

    return NextResponse.json({ success: true, data, publicKey });
  } catch (error) {
    console.error("Error fetching announcements:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id: userId, school_id: schoolId, role } = session.user;

  if (role !== "admin" && role !== "teacher") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { title, body: announcementBody, cohortId, priority, mediaUrl } = body as {
      title: string;
      body: string;
      cohortId: string | null;
      priority: "standard" | "emergency";
      mediaUrl?: string;
    };

    if (!title || !announcementBody) {
      return NextResponse.json(
        { success: false, error: "Title and body are required" },
        { status: 400 }
      );
    }

    await setDbSession(db, userId, schoolId);

    // Teacher: validate cohort ownership
    if (role === "teacher") {
      if (!cohortId) {
        return NextResponse.json(
          { success: false, error: "Teachers must specify a cohort" },
          { status: 400 }
        );
      }

      const ownership = await db
        .select({ id: teacherCohorts.id })
        .from(teacherCohorts)
        .where(
          and(
            eq(teacherCohorts.teacherId, userId),
            eq(teacherCohorts.cohortId, cohortId)
          )
        )
        .limit(1);

      if (ownership.length === 0) {
        return NextResponse.json(
          { success: false, error: "You are not assigned to this cohort" },
          { status: 403 }
        );
      }
    }

    // Build the announcement row
    const now = new Date();
    const timestamp = now.toISOString();

    let signature: string | null = null;
    if (role === "admin") {
      try {
        signature = signAnnouncement(title, announcementBody, timestamp);
      } catch (e) {
        console.error("Failed to sign announcement:", e);
        // Continue without signature if key not configured
      }
    }

    const [created] = await db
      .insert(announcements)
      .values({
        schoolId,
        authorId: userId,
        cohortId: cohortId || null,
        title,
        body: announcementBody,
        mediaUrl: mediaUrl || null,
        priority: priority || "standard",
        signature,
        isVerified: signature !== null,
      })
      .returning();

    // Determine recipients for notification routing
    let recipientIds: string[] = [];

    if (cohortId) {
      // Get students in cohort
      const studentRows = await db
        .select({ studentId: studentCohorts.studentId })
        .from(studentCohorts)
        .where(eq(studentCohorts.cohortId, cohortId));

      const studentIds = studentRows.map((r) => r.studentId);

      // Get parents linked to those students
      if (studentIds.length > 0) {
        const parentRows = await db
          .select({ parentId: parentStudentLinks.parentId })
          .from(parentStudentLinks)
          .where(inArray(parentStudentLinks.studentId, studentIds));

        const parentIds = parentRows.map((r) => r.parentId);
        recipientIds = [...new Set([...studentIds, ...parentIds])];
      }
    } else {
      // School-wide: all active users except the author
      const allUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.schoolId, schoolId), eq(users.isActive, true)));

      recipientIds = allUsers.map((u) => u.id).filter((id) => id !== userId);
    }

    // Route notifications
    if (recipientIds.length > 0) {
      await routeAnnouncement(
        {
          id: created.id,
          title,
          body: announcementBody,
          priority: priority || "standard",
          schoolId,
          authorId: userId,
        },
        recipientIds,
        db,
        userId,
        schoolId
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: created.id,
        title: created.title,
        body: created.body,
        priority: created.priority,
        signature: created.signature,
        createdAt: created.createdAt?.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error creating announcement:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
