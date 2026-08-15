import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users, teacherCohorts, studentCohorts, cohorts } from "@/db/schema";
import { setDbSession } from "@/lib/db-session";
import { and, eq, inArray, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
  }

  const userId = session.user.id;
  const schoolId = session.user.school_id;
  await setDbSession(db, userId, schoolId);

  const searchParams = request.nextUrl.searchParams;
  const role = searchParams.get("role");
  const search = searchParams.get("search")?.trim().toLowerCase() ?? "";
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20", 10), 1), 50);
  const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);

  const allowedRoles = ["admin", "teacher", "parent", "student"] as const;
  type AllowedRole = (typeof allowedRoles)[number];
  const roleParam =
    role && role !== "all" && allowedRoles.includes(role as AllowedRole)
      ? (role as AllowedRole)
      : undefined;

  const whereClauses: Array<ReturnType<typeof eq> | ReturnType<typeof sql>> = [eq(users.schoolId, schoolId)];

  if (roleParam) {
    whereClauses.push(eq(users.role, roleParam));
  }

  if (search) {
    whereClauses.push(
      sql`(lower(${users.fullName}) LIKE ${`%${search}%`} OR lower(${users.email}) LIKE ${`%${search}%`})`
    );
  }

  try {
    const usersList = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        role: users.role,
        phone: users.phone,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(and(...whereClauses))
      .orderBy(users.createdAt)
      .limit(limit)
      .offset(offset);

    const userIds = usersList.map((item) => item.id);
    let cohortMap: Record<string, string[]> = {};

    if (userIds.length > 0) {
      const teacherRows = await db
        .select({ userId: teacherCohorts.teacherId, cohortName: cohorts.name })
        .from(teacherCohorts)
        .innerJoin(cohorts, eq(teacherCohorts.cohortId, cohorts.id))
        .where(inArray(teacherCohorts.teacherId, userIds));

      const studentRows = await db
        .select({ userId: studentCohorts.studentId, cohortName: cohorts.name })
        .from(studentCohorts)
        .innerJoin(cohorts, eq(studentCohorts.cohortId, cohorts.id))
        .where(inArray(studentCohorts.studentId, userIds));

      cohortMap = {};
      [...teacherRows, ...studentRows].forEach((row) => {
        if (!cohortMap[row.userId]) {
          cohortMap[row.userId] = [];
        }
        if (!cohortMap[row.userId].includes(row.cohortName)) {
          cohortMap[row.userId].push(row.cohortName);
        }
      });
    }

    const usersWithCohorts = usersList.map((item) => ({
      id: item.id,
      full_name: item.fullName,
      email: item.email,
      role: item.role,
      phone: item.phone,
      is_active: item.isActive,
      created_at: item.createdAt.toISOString(),
      cohort_names: cohortMap[item.id] ?? [],
    }));

    const [{ total }] = await db
      .select({ total: sql`COUNT(*)`.as("total") })
      .from(users)
      .where(and(...whereClauses));

    return NextResponse.json({ success: true, data: { users: usersWithCohorts, total: Number(total) } });
  } catch (error) {
    console.error("Error fetching admin users:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
