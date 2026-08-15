// src/app/api/teacher/classes/route.ts
// GET: Teacher's cohorts with student list, parent count, and recent announcement count

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  cohorts,
  teacherCohorts,
  studentCohorts,
  parentStudentLinks,
  announcements,
  users,
} from "@/db/schema";
import { withTenant } from "@/lib/db-session";
import { and, eq, gte, inArray, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id: userId, role, school_id: schoolId } = session.user;

  if (role !== "teacher") {
    return NextResponse.json({ success: false, error: "Teacher access required" }, { status: 403 });
  }

  try {
    return await withTenant(session.user, async (tx) => {
    // 1. Get teacher's cohorts
    const cohortRows = await tx
      .select({ id: cohorts.id, name: cohorts.name, academicYear: cohorts.academicYear })
      .from(teacherCohorts)
      .innerJoin(cohorts, eq(teacherCohorts.cohortId, cohorts.id))
      .where(eq(teacherCohorts.teacherId, userId))
      .orderBy(cohorts.name);

    if (cohortRows.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const cohortIds = cohortRows.map((r) => r.id);

    // 2. Get students per cohort
    const studentRows = await tx
      .select({
        cohortId: studentCohorts.cohortId,
        studentId: studentCohorts.studentId,
        studentName: users.fullName,
        studentEmail: users.email,
        studentAvatar: users.avatarUrl,
      })
      .from(studentCohorts)
      .innerJoin(users, eq(studentCohorts.studentId, users.id))
      .where(inArray(studentCohorts.cohortId, cohortIds))
      .orderBy(users.fullName);

    // 3. Count unique parents per cohort via parentStudentLinks
    const studentIds = studentRows.map((r) => r.studentId);
    const parentCohortMap: Record<string, Set<string>> = {};

    if (studentIds.length > 0) {
      const parentRows = await tx
        .select({ parentId: parentStudentLinks.parentId, studentId: parentStudentLinks.studentId })
        .from(parentStudentLinks)
        .where(inArray(parentStudentLinks.studentId, studentIds));

      const studentToCohort: Record<string, string> = {};
      for (const sr of studentRows) studentToCohort[sr.studentId] = sr.cohortId;

      for (const pr of parentRows) {
        const cId = studentToCohort[pr.studentId];
        if (!cId) continue;
        if (!parentCohortMap[cId]) parentCohortMap[cId] = new Set();
        parentCohortMap[cId].add(pr.parentId);
      }
    }

    // 4. Recent announcement counts per cohort (last 7 days, by this teacher)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const annRows = await tx
      .select({
        cohortId: announcements.cohortId,
        count: sql<number>`COUNT(*)`,
      })
      .from(announcements)
      .where(
        and(
          eq(announcements.schoolId, schoolId),
          eq(announcements.authorId, userId),
          inArray(announcements.cohortId, cohortIds),
          gte(announcements.createdAt, sevenDaysAgo),
        )
      )
      .groupBy(announcements.cohortId);

    const annCountMap: Record<string, number> = {};
    for (const ar of annRows) {
      if (ar.cohortId) annCountMap[ar.cohortId] = Number(ar.count);
    }

    // 5. Group students by cohort
    const studentsByCohort: Record<string, typeof studentRows> = {};
    for (const sr of studentRows) {
      if (!studentsByCohort[sr.cohortId]) studentsByCohort[sr.cohortId] = [];
      studentsByCohort[sr.cohortId].push(sr);
    }

    const data = cohortRows.map((cohort) => ({
      id: cohort.id,
      name: cohort.name,
      academicYear: cohort.academicYear,
      studentCount: (studentsByCohort[cohort.id] || []).length,
      parentCount: parentCohortMap[cohort.id]?.size ?? 0,
      recentAnnouncementCount: annCountMap[cohort.id] ?? 0,
      students: (studentsByCohort[cohort.id] || []).map((s) => ({
        id: s.studentId,
        name: s.studentName,
        email: s.studentEmail,
        avatarUrl: s.studentAvatar,
      })),
    }));

    return NextResponse.json({ success: true, data });
    });
  } catch (error) {
    console.error("Error fetching teacher classes:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
