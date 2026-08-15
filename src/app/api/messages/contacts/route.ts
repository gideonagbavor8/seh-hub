import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  users,
  teacherCohorts,
  studentCohorts,
  parentStudentLinks,
  cohorts,
} from "@/db/schema";
import { setDbSession } from "@/lib/db-session";
import { aliasedTable } from "drizzle-orm/alias";
import { and, eq } from "drizzle-orm";

const teacher = aliasedTable(users, "teacher");
const parent = aliasedTable(users, "parent");
const student = aliasedTable(users, "student");

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id: userId, role, school_id: schoolId } = session.user;

  if (role === "student") {
    return NextResponse.json(
      { success: false, error: "Students do not have messaging access" },
      { status: 403 }
    );
  }

  if (role === "admin") {
    return NextResponse.json({ success: false, error: "Admins should not use the message contact picker" }, { status: 403 });
  }

  await setDbSession(db, userId, schoolId);

  if (role === "parent") {
    const rows = await db
      .select({
        teacherId: teacher.id,
        teacherName: teacher.fullName,
        teacherAvatar: teacher.avatarUrl,
        cohortName: cohorts.name,
      })
      .from(parentStudentLinks)
      .innerJoin(studentCohorts, eq(parentStudentLinks.studentId, studentCohorts.studentId))
      .innerJoin(teacherCohorts, eq(studentCohorts.cohortId, teacherCohorts.cohortId))
      .innerJoin(cohorts, eq(studentCohorts.cohortId, cohorts.id))
      .innerJoin(teacher, eq(teacherCohorts.teacherId, teacher.id))
      .where(eq(parentStudentLinks.parentId, userId));

    const contacts = new Map<string, { id: string; name: string; avatarUrl: string | null; role: string; context: string }>();
    for (const row of rows) {
      if (!contacts.has(row.teacherId)) {
        contacts.set(row.teacherId, {
          id: row.teacherId,
          name: row.teacherName,
          avatarUrl: row.teacherAvatar,
          role: "teacher",
          context: `Cohort: ${row.cohortName}`,
        });
      }
    }

    return NextResponse.json({ success: true, data: Array.from(contacts.values()) });
  }

  const rows = await db
    .select({
      parentId: parent.id,
      parentName: parent.fullName,
      parentAvatar: parent.avatarUrl,
      studentName: student.fullName,
      cohortName: cohorts.name,
    })
    .from(teacherCohorts)
    .innerJoin(studentCohorts, eq(teacherCohorts.cohortId, studentCohorts.cohortId))
    .innerJoin(parentStudentLinks, eq(studentCohorts.studentId, parentStudentLinks.studentId))
    .innerJoin(parent, eq(parentStudentLinks.parentId, parent.id))
    .innerJoin(student, eq(student.id, studentCohorts.studentId))
    .innerJoin(cohorts, eq(teacherCohorts.cohortId, cohorts.id))
    .where(eq(teacherCohorts.teacherId, userId));

  const contacts = new Map<string, { id: string; name: string; avatarUrl: string | null; role: string; context: string }>();
  for (const row of rows) {
    const existing = contacts.get(row.parentId);
    const context = existing
      ? existing.context
      : `Student: ${row.studentName} • ${row.cohortName}`;

    if (!existing) {
      contacts.set(row.parentId, {
        id: row.parentId,
        name: row.parentName,
        avatarUrl: row.parentAvatar,
        role: "parent",
        context,
      });
    }
  }

  return NextResponse.json({ success: true, data: Array.from(contacts.values()) });
}
