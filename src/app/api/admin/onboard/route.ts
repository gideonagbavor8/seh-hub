import bcrypt from "bcryptjs";
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { schools, automationJobs, cohorts, parentStudentLinks, studentCohorts, teacherCohorts, users } from "@/db/schema";
import { withTenant } from "@/lib/db-session";
import { and, eq } from "drizzle-orm";
import { findExistingEmails, parseOnboardingFile, validateOnboardingRows } from "@/lib/admin-onboarding";

const TEMP_PASSWORD_TEMPLATE = (schoolSlug: string) => `SEHHub@${schoolSlug}2026`;

interface OnboardResult {
  success: true;
  created: {
    teachers: number;
    students: number;
    parents: number;
    cohorts: number;
  };
  skipped: string[];
  warnings: string[];
  sms_jobs_queued: number;
}

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
  }

  const userId = session.user.id;
  const schoolId = session.user.school_id;
  const schoolSlug = session.user.school_slug;
  const schoolName = session.user.school_slug;

  const schoolRows = await withTenant(session.user, (tx) =>
    tx
      .select({ name: schools.name })
      .from(schools)
      .where(eq(schools.id, schoolId))
      .limit(1)
  );

  const actualSchoolName = schoolRows.length > 0 ? schoolRows[0].name : schoolName;

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ success: false, error: "File is required" }, { status: 400 });
  }

  const fileName = file.name;
  let parsedRows;

  try {
    parsedRows = await parseOnboardingFile(file, fileName);
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Invalid file" }, { status: 400 });
  }

  if (parsedRows.length === 0) {
    return NextResponse.json({ success: false, error: "The file contains no rows to process." }, { status: 400 });
  }

  try {
    const validation = validateOnboardingRows(parsedRows);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: "Validation failed", data: { errors: validation.errors } }, { status: 400 });
    }

    const allEmails = Array.from(
      new Set<string>([
        ...parsedRows.map((row) => row.teacher_email.toLowerCase()),
        ...parsedRows.map((row) => row.student_email.toLowerCase()),
        ...parsedRows.map((row) => row.parent_email.toLowerCase()),
      ])
    );

    const existingEmails = await withTenant(session.user, (tx) =>
      findExistingEmails(tx, schoolId, allEmails)
    );
    if (existingEmails.size > 0) {
      const errors = Array.from(existingEmails).map((email) => `Email already exists in school: ${email}`);
      return NextResponse.json({ success: false, error: "Validation failed", data: { errors } }, { status: 400 });
    }

    const result = await withTenant(session.user, async (tx) => {
      const cohortNames = Array.from(new Set(parsedRows.map((row) => row.cohort_name.trim())));
      const cohortMap = new Map<string, { id: string; name: string }>();

      for (const cohortName of cohortNames) {
        const existing = await tx
          .select({ id: cohorts.id, name: cohorts.name })
          .from(cohorts)
          .where(and(eq(cohorts.schoolId, schoolId), eq(cohorts.name, cohortName)))
          .limit(1);

        if (existing.length > 0) {
          cohortMap.set(cohortName, existing[0]);
          continue;
        }

        const [createdCohort] = await tx
          .insert(cohorts)
          .values({ schoolId, name: cohortName, academicYear: "2025/2026" })
          .returning({ id: cohorts.id, name: cohorts.name });

        cohortMap.set(cohortName, createdCohort);
      }

      const teacherRows = Array.from(
        new Map(parsedRows.map((row) => [row.teacher_email.toLowerCase(), row])).values()
      );
      const studentRows = Array.from(
        new Map(parsedRows.map((row) => [row.student_email.toLowerCase(), row])).values()
      );
      const parentRows = Array.from(
        new Map(parsedRows.map((row) => [row.parent_email.toLowerCase(), row])).values()
      );

      const teacherMap = new Map<string, string>();
      for (const row of teacherRows) {
        const passwordHash = await bcrypt.hash(TEMP_PASSWORD_TEMPLATE(schoolSlug), 10);
        const [createdTeacher] = await tx
          .insert(users)
          .values({
            email: row.teacher_email.toLowerCase(),
            fullName: row.teacher_name,
            passwordHash,
            role: "teacher",
            schoolId,
          })
          .returning({ id: users.id, email: users.email });

        teacherMap.set(row.teacher_email.toLowerCase(), createdTeacher.id);

        await tx.insert(automationJobs).values({
          schoolId,
          jobType: "welcome_sms",
          payload: {
            phone: row.parent_phone,
            name: row.teacher_name,
            email: row.teacher_email.toLowerCase(),
            school_name: schoolName,
            school_slug: schoolSlug,
            temp_password: TEMP_PASSWORD_TEMPLATE(schoolSlug),
          },
          status: "pending",
          attempts: 0,
          maxAttempts: 3,
        });
      }

      const studentMap = new Map<string, string>();
      for (const row of studentRows) {
        const passwordHash = await bcrypt.hash(TEMP_PASSWORD_TEMPLATE(schoolSlug), 10);
        const [createdStudent] = await tx
          .insert(users)
          .values({
            email: row.student_email.toLowerCase(),
            fullName: row.student_name,
            passwordHash,
            role: "student",
            schoolId,
          })
          .returning({ id: users.id, email: users.email });

        studentMap.set(row.student_email.toLowerCase(), createdStudent.id);

        await tx.insert(automationJobs).values({
          schoolId,
          jobType: "welcome_sms",
          payload: {
            phone: row.parent_phone,
            name: row.student_name,
            email: row.student_email.toLowerCase(),
            school_name: schoolName,
            school_slug: schoolSlug,
            temp_password: TEMP_PASSWORD_TEMPLATE(schoolSlug),
          },
          status: "pending",
          attempts: 0,
          maxAttempts: 3,
        });
      }

      const parentMap = new Map<string, string>();
      for (const row of parentRows) {
        const passwordHash = await bcrypt.hash(TEMP_PASSWORD_TEMPLATE(schoolSlug), 10);
        const [createdParent] = await tx
          .insert(users)
          .values({
            email: row.parent_email.toLowerCase(),
            fullName: row.parent_name,
            phone: row.parent_phone,
            passwordHash,
            role: "parent",
            schoolId,
          })
          .returning({ id: users.id, email: users.email });

        parentMap.set(row.parent_email.toLowerCase(), createdParent.id);

        await tx.insert(automationJobs).values({
          schoolId,
          jobType: "welcome_sms",
          payload: {
            phone: row.parent_phone,
            name: row.parent_name,
            email: row.parent_email.toLowerCase(),
            school_name: schoolName,
            school_slug: schoolSlug,
            temp_password: TEMP_PASSWORD_TEMPLATE(schoolSlug),
          },
          status: "pending",
          attempts: 0,
          maxAttempts: 3,
        });
      }

      const cohortTeacherPairs = new Set<string>();
      for (const row of parsedRows) {
        const teacherEmail = row.teacher_email.toLowerCase();
        const teacherId = teacherMap.get(teacherEmail);
        const cohortId = cohortMap.get(row.cohort_name)?.id;
        if (!teacherId || !cohortId) continue;

        const key = `${teacherId}:${cohortId}`;
        if (!cohortTeacherPairs.has(key)) {
          cohortTeacherPairs.add(key);
          await tx.insert(teacherCohorts).values({ teacherId, cohortId });
        }
      }

      const cohortStudentPairs = new Set<string>();
      for (const row of parsedRows) {
        const studentEmail = row.student_email.toLowerCase();
        const studentId = studentMap.get(studentEmail);
        const cohortId = cohortMap.get(row.cohort_name)?.id;
        if (!studentId || !cohortId) continue;

        const key = `${studentId}:${cohortId}`;
        if (!cohortStudentPairs.has(key)) {
          cohortStudentPairs.add(key);
          await tx.insert(studentCohorts).values({ studentId, cohortId });
        }
      }

      const parentStudentPairs = new Set<string>();
      for (const row of parsedRows) {
        const parentEmail = row.parent_email.toLowerCase();
        const studentEmail = row.student_email.toLowerCase();
        const parentId = parentMap.get(parentEmail);
        const studentId = studentMap.get(studentEmail);
        if (!parentId || !studentId) continue;

        const key = `${parentId}:${studentId}`;
        if (!parentStudentPairs.has(key)) {
          parentStudentPairs.add(key);
          await tx.insert(parentStudentLinks).values({ parentId, studentId });
        }
      }

      return {
        teachers: teacherMap.size,
        students: studentMap.size,
        parents: parentMap.size,
        cohorts: cohortNames.length,
        smsJobs: teacherMap.size + studentMap.size + parentMap.size,
      };
    });

    const response: OnboardResult = {
      success: true,
      created: {
        teachers: result.teachers,
        students: result.students,
        parents: result.parents,
        cohorts: result.cohorts,
      },
      skipped: [],
      warnings: [],
      sms_jobs_queued: result.smsJobs,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Admin onboard failed:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
