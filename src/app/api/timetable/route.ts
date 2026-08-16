// src/app/api/timetable/route.ts
// GET: the weekly timetable the caller is entitled to see.
//   student → their own cohort
//   parent  → their children's cohorts
//   staff   → any cohort, via ?cohortId=

import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { timetableSlots, cohorts, users, studentCohorts, parentStudentLinks } from "@/db/schema";
import { withTenant } from "@/lib/db-session";
import { and, asc, eq, inArray } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id: userId, role, school_id: schoolId } = session.user;
  const requestedCohort = request.nextUrl.searchParams.get("cohortId");

  try {
    const data = await withTenant(session.user, async (tx) => {
      // Work out which cohorts to show. RLS would block anything else anyway;
      // this just picks a sensible default per role.
      let cohortIds: string[] = [];

      if (role === "student") {
        const own = await tx
          .select({ cohortId: studentCohorts.cohortId })
          .from(studentCohorts)
          .where(eq(studentCohorts.studentId, userId));
        cohortIds = own.map((c) => c.cohortId);
      } else if (role === "parent") {
        const kids = await tx
          .select({ cohortId: studentCohorts.cohortId })
          .from(parentStudentLinks)
          .innerJoin(studentCohorts, eq(parentStudentLinks.studentId, studentCohorts.studentId))
          .where(eq(parentStudentLinks.parentId, userId));
        cohortIds = Array.from(new Set(kids.map((c) => c.cohortId)));
      } else if (requestedCohort) {
        cohortIds = [requestedCohort];
      }

      const slots = await tx
        .select({
          id: timetableSlots.id,
          cohortId: timetableSlots.cohortId,
          cohortName: cohorts.name,
          dayOfWeek: timetableSlots.dayOfWeek,
          startTime: timetableSlots.startTime,
          endTime: timetableSlots.endTime,
          subject: timetableSlots.subject,
          room: timetableSlots.room,
          teacherName: users.fullName,
        })
        .from(timetableSlots)
        .innerJoin(cohorts, eq(timetableSlots.cohortId, cohorts.id))
        .leftJoin(users, eq(timetableSlots.teacherId, users.id))
        .where(
          cohortIds.length > 0
            ? and(
                eq(timetableSlots.schoolId, schoolId),
                inArray(timetableSlots.cohortId, cohortIds)
              )
            : eq(timetableSlots.schoolId, schoolId)
        )
        .orderBy(asc(timetableSlots.dayOfWeek), asc(timetableSlots.startTime));

      return slots.map((s) => ({
        id: s.id,
        cohort_id: s.cohortId,
        cohort_name: s.cohortName,
        day_of_week: s.dayOfWeek,
        start_time: s.startTime,
        end_time: s.endTime,
        subject: s.subject,
        room: s.room,
        teacher_name: s.teacherName,
      }));
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error fetching timetable:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
