// src/app/api/overview/stats/route.ts
// Returns role-specific dashboard stats from real DB data

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  users,
  announcements,
  directMessages,
  teacherCohorts,
  studentCohorts,
  parentStudentLinks,
} from "@/db/schema";
import { withTenant } from "@/lib/db-session";
import { and, eq, gte, inArray, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id: userId, school_id: schoolId, role } = session.user;

  try {
    // One transaction for the whole handler.
    //
    // These counts run SEQUENTIALLY on purpose. A transaction is a single
    // connection, and firing queries at it concurrently with Promise.all
    // silently returns wrong results — the first query resolves correctly and
    // the rest come back as zero. It was safe before only because the old HTTP
    // driver gave every query its own connection.
    return await withTenant(session.user, async (tx) => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    if (role === "admin") {
      const [teacherRow] = await tx.select({ count: sql<number>`COUNT(*)` }).from(users)
        .where(and(eq(users.schoolId, schoolId), eq(users.role, "teacher"), eq(users.isActive, true)));
      const [studentRow] = await tx.select({ count: sql<number>`COUNT(*)` }).from(users)
        .where(and(eq(users.schoolId, schoolId), eq(users.role, "student"), eq(users.isActive, true)));
      const [annRow] = await tx.select({ count: sql<number>`COUNT(*)` }).from(announcements)
        .where(and(eq(announcements.schoolId, schoolId), gte(announcements.createdAt, sevenDaysAgo)));


      return NextResponse.json({
        success: true,
        data: [
          { key: "students",  value: Number(studentRow?.count  ?? 0) },
          { key: "teachers",  value: Number(teacherRow?.count  ?? 0) },
          { key: "posts",     value: Number(annRow?.count      ?? 0) },
        ],
      });
    }

    if (role === "teacher") {
      const studentRows = await tx
        .select({ studentId: studentCohorts.studentId })
        .from(teacherCohorts)
        .innerJoin(studentCohorts, eq(teacherCohorts.cohortId, studentCohorts.cohortId))
        .where(eq(teacherCohorts.teacherId, userId));

      const uniqueStudents = new Set(studentRows.map((r) => r.studentId)).size;

      const [unreadRow] = await tx.select({ count: sql<number>`COUNT(*)` }).from(directMessages)
        .where(and(
          eq(directMessages.schoolId, schoolId),
          eq(directMessages.receiverId, userId),
          eq(directMessages.isRead, false),
        ));
      const [annRow] = await tx.select({ count: sql<number>`COUNT(*)` }).from(announcements)
        .where(and(
          eq(announcements.schoolId, schoolId),
          eq(announcements.authorId, userId),
          gte(announcements.createdAt, sevenDaysAgo),
        ));

      return NextResponse.json({
        success: true,
        data: [
          { key: "students", value: uniqueStudents },
          { key: "messages", value: Number(unreadRow?.count ?? 0) },
          { key: "posts",    value: Number(annRow?.count   ?? 0) },
        ],
      });
    }

    if (role === "parent") {
      const [childRow] = await tx.select({ count: sql<number>`COUNT(*)` }).from(parentStudentLinks)
        .where(eq(parentStudentLinks.parentId, userId));
      const [annRow] = await tx.select({ count: sql<number>`COUNT(*)` }).from(announcements)
        .where(and(eq(announcements.schoolId, schoolId), gte(announcements.createdAt, sevenDaysAgo)));
      const [unreadRow] = await tx.select({ count: sql<number>`COUNT(*)` }).from(directMessages)
        .where(and(
          eq(directMessages.schoolId, schoolId),
          eq(directMessages.receiverId, userId),
          eq(directMessages.isRead, false),
        ));

      return NextResponse.json({
        success: true,
        data: [
          { key: "children",       value: Number(childRow?.count  ?? 0) },
          { key: "announcements",  value: Number(annRow?.count    ?? 0) },
          { key: "messages",       value: Number(unreadRow?.count ?? 0) },
        ],
      });
    }

    if (role === "student") {
      const [annRow] = await tx
        .select({ count: sql<number>`COUNT(*)` })
        .from(announcements)
        .where(and(eq(announcements.schoolId, schoolId), gte(announcements.createdAt, sevenDaysAgo)));

      return NextResponse.json({
        success: true,
        data: [
          { key: "announcements", value: Number(annRow?.count ?? 0) },
          { key: "homework",      value: 0 },
          { key: "events",        value: 0 },
        ],
      });
    }

    return NextResponse.json({ success: true, data: [] });
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
