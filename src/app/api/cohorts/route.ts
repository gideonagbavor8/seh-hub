// src/app/api/cohorts/route.ts
// GET: Returns cohorts scoped to the requesting user's role
//   admin  → all school cohorts
//   teacher → only cohorts they are assigned to

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { cohorts, teacherCohorts } from "@/db/schema";
import { setDbSession } from "@/lib/db-session";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id: userId, school_id: schoolId, role } = session.user;

  if (role !== "admin" && role !== "teacher") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  try {
    await setDbSession(db, userId, schoolId);

    if (role === "admin") {
      const rows = await db
        .select({ id: cohorts.id, name: cohorts.name, academicYear: cohorts.academicYear })
        .from(cohorts)
        .where(eq(cohorts.schoolId, schoolId))
        .orderBy(cohorts.name);

      return NextResponse.json({ success: true, data: rows });
    }

    // Teacher — only their assigned cohorts
    const rows = await db
      .select({ id: cohorts.id, name: cohorts.name, academicYear: cohorts.academicYear })
      .from(teacherCohorts)
      .innerJoin(cohorts, eq(teacherCohorts.cohortId, cohorts.id))
      .where(eq(teacherCohorts.teacherId, userId))
      .orderBy(cohorts.name);

    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error("Error fetching cohorts:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
