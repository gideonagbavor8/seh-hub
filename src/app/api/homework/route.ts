// src/app/api/homework/route.ts
// GET:  homework visible to the caller, with completion state
// POST: teacher (or admin) sets homework for a cohort they teach

import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import {
  homework,
  homeworkCompletions,
  cohorts,
  users,
  studentCohorts,
  parentStudentLinks,
  notifications,
} from "@/db/schema";
import { withTenant, isRlsViolation } from "@/lib/db-session";
import { and, desc, eq, inArray, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id: userId, role, school_id: schoolId } = session.user;
  const cohortFilter = request.nextUrl.searchParams.get("cohortId");
  const countOnly = request.nextUrl.searchParams.get("count") === "true";

  // Lightweight path for the sidebar badge: how much work is still outstanding.
  // Only students and parents have an actionable number here — a teacher's
  // homework is never "outstanding" for them.
  if (countOnly) {
    if (role !== "student" && role !== "parent") {
      return NextResponse.json({ success: true, data: { outstanding: 0 } });
    }

    try {
      const outstanding = await withTenant(session.user, async (tx) => {
        // RLS already narrows `homework` to this person's cohorts.
        const visible = await tx
          .select({ id: homework.id, cohortId: homework.cohortId })
          .from(homework)
          .where(eq(homework.schoolId, schoolId));

        if (visible.length === 0) return 0;

        const ids = visible.map((h) => h.id);
        const done = await tx
          .select({
            homeworkId: homeworkCompletions.homeworkId,
            studentId: homeworkCompletions.studentId,
          })
          .from(homeworkCompletions)
          .where(inArray(homeworkCompletions.homeworkId, ids));

        if (role === "student") {
          const mine = new Set(done.filter((d) => d.studentId === userId).map((d) => d.homeworkId));
          return visible.filter((h) => !mine.has(h.id)).length;
        }

        // Parent: anything at least one of their children has not finished.
        const kids = await tx
          .select({ studentId: parentStudentLinks.studentId })
          .from(parentStudentLinks)
          .where(eq(parentStudentLinks.parentId, userId));
        const childIds = kids.map((k) => k.studentId);

        return visible.filter(
          (h) => !childIds.every((cid) => done.some((d) => d.homeworkId === h.id && d.studentId === cid))
        ).length;
      });

      return NextResponse.json({ success: true, data: { outstanding } });
    } catch (error) {
      console.error("Error counting homework:", error);
      return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
    }
  }

  try {
    const data = await withTenant(session.user, async (tx) => {
      // RLS already limits rows to what this person may see; the cohort filter
      // is only a narrowing convenience for staff.
      const rows = await tx
        .select({
          id: homework.id,
          subject: homework.subject,
          title: homework.title,
          instructions: homework.instructions,
          dueDate: homework.dueDate,
          createdAt: homework.createdAt,
          cohortId: homework.cohortId,
          cohortName: cohorts.name,
          teacherName: users.fullName,
        })
        .from(homework)
        .innerJoin(cohorts, eq(homework.cohortId, cohorts.id))
        .innerJoin(users, eq(homework.teacherId, users.id))
        .where(
          cohortFilter
            ? and(eq(homework.schoolId, schoolId), eq(homework.cohortId, cohortFilter))
            : eq(homework.schoolId, schoolId)
        )
        .orderBy(desc(homework.dueDate))
        .limit(60);

      if (rows.length === 0) return [];
      const ids = rows.map((r) => r.id);

      // Which students each piece of work is for — used for the "3 of 5 done"
      // progress a teacher sees.
      const cohortIds = Array.from(new Set(rows.map((r) => r.cohortId)));
      const rosters = await tx
        .select({ cohortId: studentCohorts.cohortId, studentId: studentCohorts.studentId })
        .from(studentCohorts)
        .where(inArray(studentCohorts.cohortId, cohortIds));

      const rosterSize = new Map<string, number>();
      for (const r of rosters) {
        rosterSize.set(r.cohortId, (rosterSize.get(r.cohortId) ?? 0) + 1);
      }

      const completions = await tx
        .select({
          homeworkId: homeworkCompletions.homeworkId,
          studentId: homeworkCompletions.studentId,
        })
        .from(homeworkCompletions)
        .where(inArray(homeworkCompletions.homeworkId, ids));

      // A parent needs their own children's status, not a class aggregate.
      let childIds: string[] = [];
      if (role === "parent") {
        const kids = await tx
          .select({ studentId: parentStudentLinks.studentId })
          .from(parentStudentLinks)
          .where(eq(parentStudentLinks.parentId, userId));
        childIds = kids.map((k) => k.studentId);
      }

      const childNames = new Map<string, string>();
      if (childIds.length > 0) {
        const kids = await tx
          .select({ id: users.id, fullName: users.fullName })
          .from(users)
          .where(inArray(users.id, childIds));
        kids.forEach((k) => childNames.set(k.id, k.fullName));
      }

      return rows.map((r) => {
        const done = completions.filter((c) => c.homeworkId === r.id);
        return {
          id: r.id,
          subject: r.subject,
          title: r.title,
          instructions: r.instructions,
          due_date: r.dueDate.toISOString(),
          created_at: r.createdAt.toISOString(),
          cohort_id: r.cohortId,
          cohort_name: r.cohortName,
          teacher_name: r.teacherName,
          // Student: have I done it? Teacher/admin: how many of the class have?
          completed_by_me: role === "student" ? done.some((d) => d.studentId === userId) : null,
          completed_count: done.length,
          roster_count: rosterSize.get(r.cohortId) ?? 0,
          children:
            role === "parent"
              ? childIds.map((cid) => ({
                  id: cid,
                  name: childNames.get(cid) ?? "Child",
                  completed: done.some((d) => d.studentId === cid),
                }))
              : null,
        };
      });
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error fetching homework:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id: userId, role, school_id: schoolId } = session.user;

  if (role !== "teacher" && role !== "admin") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    cohortId?: string;
    subject?: string;
    title?: string;
    instructions?: string;
    dueDate?: string;
  };

  const cohortId = body.cohortId?.trim();
  const subject = body.subject?.trim();
  const title = body.title?.trim();
  const instructions = body.instructions?.trim();
  const dueDate = body.dueDate ? new Date(body.dueDate) : null;

  if (!cohortId || !subject || !title || !instructions || !dueDate || Number.isNaN(+dueDate)) {
    return NextResponse.json(
      { success: false, error: "Class, subject, title, instructions and due date are all required." },
      { status: 400 }
    );
  }

  try {
    const created = await withTenant(session.user, async (tx) => {
      const [row] = await tx
        .insert(homework)
        .values({
          schoolId,
          cohortId,
          teacherId: userId,
          subject,
          title,
          instructions,
          dueDate,
        })
        .returning({ id: homework.id, title: homework.title, dueDate: homework.dueDate });

      // Tell the class and their parents. Same transaction as the insert, so
      // homework is never created silently without anyone being told.
      const roster = await tx
        .select({ studentId: studentCohorts.studentId })
        .from(studentCohorts)
        .where(eq(studentCohorts.cohortId, cohortId));

      const studentIds = roster.map((r) => r.studentId);
      let recipientIds = [...studentIds];

      if (studentIds.length > 0) {
        const guardians = await tx
          .select({ parentId: parentStudentLinks.parentId })
          .from(parentStudentLinks)
          .where(inArray(parentStudentLinks.studentId, studentIds));
        recipientIds = Array.from(new Set([...studentIds, ...guardians.map((g) => g.parentId)]));
      }

      // Never notify the teacher about their own homework.
      recipientIds = recipientIds.filter((id) => id !== userId);

      if (recipientIds.length > 0) {
        const due = dueDate.toLocaleDateString("en-GB", {
          weekday: "short",
          day: "numeric",
          month: "short",
        });

        for (let i = 0; i < recipientIds.length; i += 50) {
          await tx.insert(notifications).values(
            recipientIds.slice(i, i + 50).map((recipientId) => ({
              userId: recipientId,
              schoolId,
              title: `New ${subject} homework`,
              body: `${title} — due ${due}`,
              type: "homework" as const,
              meta: { homework_id: row.id, cohort_id: cohortId },
            }))
          );
        }
      }

      return row;
    });

    return NextResponse.json({
      success: true,
      data: { id: created.id, title: created.title, due_date: created.dueDate.toISOString() },
    });
  } catch (error) {
    // The RLS insert policy rejects a cohort the teacher does not teach.
    if (isRlsViolation(error)) {
      return NextResponse.json(
        { success: false, error: "You can only set homework for a class you teach." },
        { status: 403 }
      );
    }
    console.error("Error creating homework:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
